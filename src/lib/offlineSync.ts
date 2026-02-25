// ============================================================
// OFFLINE SYNC UTILITIES & INDEXEDDB Management
// ============================================================
// Location: src/lib/offlineSync.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSDBSchema extends DBSchema {
  bills: {
    key: string;
    value: {
      id: string;
      bill_number: string;
      customer_id?: string;
      items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        cost_price: number;
      }>;
      status: 'draft' | 'completed' | 'cancelled' | 'due' | 'overdue';
      total_amount: number;
      syncStatus: 'pending' | 'synced';
      createdAt: number;
    };
  };
  draft_bills: {
    key: string;
    value: {
      id: string;
      customer_id?: string;
      items: any[];
      salesmanName?: string;
      createdAt: number;
    };
  };
  customers: {
    key: string;
    value: any;
  };
  products: {
    key: string;
    value: any;
  };
  expenses: {
    key: string;
    value: {
      id: string;
      category: string;
      amount: number;
      description: string;
      expenseDate: string;
      syncStatus: 'pending' | 'synced';
      createdAt: number;
    };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      operationType: string;
      tableName: string;
      recordId: string;
      data: any;
      status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
      createdAt: number;
      attemptedAt?: number;
      errorMessage?: string;
    };
  };
  cache: {
    key: string;
    value: {
      type: 'products' | 'customers' | 'bills' | 'categories';
      data: any[];
      expiresAt: number;
      lastSynced: number;
    };
  };
}

class OfflineSyncManager {
  private db: IDBPDatabase<POSDBSchema> | null = null;
  private businessId: string = '';
  private userId: string = '';
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;

  async initialize(businessId: string, userId: string) {
    this.businessId = businessId;
    this.userId = userId;

    this.db = await openDB<POSDBSchema>('pos_offline_db', 1, {
      upgrade(db) {
        // Bills store
        if (!db.objectStoreNames.contains('bills')) {
          const billsStore = db.createObjectStore('bills', { keyPath: 'id' });
          billsStore.createIndex('syncStatus', 'syncStatus');
          billsStore.createIndex('createdAt', 'createdAt');
        }

        // Draft bills store
        if (!db.objectStoreNames.contains('draft_bills')) {
          db.createObjectStore('draft_bills', { keyPath: 'id' });
        }

        // Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
          customersStore.createIndex('name', 'name');
        }

        // Products store
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('category_id', 'category_id');
        }

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expensesStore.createIndex('syncStatus', 'syncStatus');
          expensesStore.createIndex('expenseDate', 'expenseDate');
        }

        // Sync queue
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          queueStore.createIndex('status', 'status');
          queueStore.createIndex('createdAt', 'createdAt');
        }

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'type' });
        }
      },
    });

    this.setupOnlineStatusListener();
  }

  private setupOnlineStatusListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // ========== BILL OPERATIONS ==========

  async saveDraftBillOffline(bill: any) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.add('draft_bills', {
      ...bill,
      id: bill.id || crypto.randomUUID(),
      createdAt: Date.now(),
    });
  }

  async finalizeDraftBillOffline(bill: any) {
    if (!this.db) throw new Error('DB not initialized');
    const id = bill.id;
    await this.db.delete('draft_bills', id);

    // Add to bills table with pending sync status
    await this.db.add('bills', {
      ...bill,
      status: 'completed',
      syncStatus: 'pending',
      createdAt: Date.now(),
    });

    // Enqueue sync operation
    await this.enqueueSyncOperation('create_bill', 'bills', id, bill);
  }

  async getDraftBills() {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAll('draft_bills');
  }

  async getPendingBills() {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAllFromIndex('bills', 'syncStatus', 'pending');
  }

  // ========== EXPENSE OPERATIONS ==========

  async saveExpenseOffline(expense: any) {
    if (!this.db) throw new Error('DB not initialized');
    const id = expense.id || crypto.randomUUID();
    await this.db.put('expenses', {
      ...expense,
      id,
      syncStatus: 'pending',
      createdAt: Date.now(),
    });

    await this.enqueueSyncOperation('create_expense', 'expenses', id, expense);
    return id;
  }

  async getPendingExpenses() {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAllFromIndex('expenses', 'syncStatus', 'pending');
  }

  // ========== CUSTOMER OPERATIONS ==========

  async cacheCustomers(customers: any[]) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.put('cache', {
      type: 'customers',
      data: customers,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      lastSynced: Date.now(),
    });
  }

  async getCachedCustomers() {
    if (!this.db) throw new Error('DB not initialized');
    const cache = await this.db.get('cache', 'customers');
    if (cache && cache.expiresAt > Date.now()) {
      return cache.data;
    }
    return null;
  }

  async saveCustomerOffline(customer: any) {
    if (!this.db) throw new Error('DB not initialized');
    const id = customer.id || crypto.randomUUID();
    await this.db.put('customers', { ...customer, id });
    await this.enqueueSyncOperation('create_customer', 'customers', id, customer);
    return id;
  }

  // ========== PRODUCT OPERATIONS ==========

  async cacheProducts(products: any[]) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.put('cache', {
      type: 'products',
      data: products,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      lastSynced: Date.now(),
    });
  }

  async getCachedProducts() {
    if (!this.db) throw new Error('DB not initialized');
    const cache = await this.db.get('cache', 'products');
    if (cache && cache.expiresAt > Date.now()) {
      return cache.data;
    }
    return null;
  }

  // ========== SYNC OPERATIONS ==========

  async enqueueSyncOperation(
    operationType: string,
    tableName: string,
    recordId: string,
    data: any
  ) {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.add('sync_queue', {
      id: crypto.randomUUID(),
      operationType,
      tableName,
      recordId,
      data,
      status: 'pending',
      createdAt: Date.now(),
    });
  }

  async syncPendingOperations() {
    if (!this.isOnline || !this.db) return;

    const queue = await this.db.getAllFromIndex('sync_queue', 'status', 'pending');
    for (const item of queue) {
      await this.processSyncItem(item);
    }
  }

  private async processSyncItem(item: any) {
    if (!this.db) throw new Error('DB not initialized');

    try {
      // Mark as syncing
      await this.db.put('sync_queue', { ...item, status: 'syncing', attemptedAt: Date.now() });

      // Call server API to sync
      const response = await fetch('/api/offline-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: this.businessId,
          operation: item,
        }),
      });

      if (response.ok) {
        await this.db.put('sync_queue', { ...item, status: 'synced' });

        // Update local records to mark as synced
        if (item.tableName === 'bills') {
          const bill = await this.db.get('bills', item.recordId);
          if (bill) {
            await this.db.put('bills', { ...bill, syncStatus: 'synced' });
          }
        } else if (item.tableName === 'expenses') {
          const expense = await this.db.get('expenses', item.recordId);
          if (expense) {
            await this.db.put('expenses', { ...expense, syncStatus: 'synced' });
          }
        }
      } else {
        const error = await response.text();
        await this.db.put('sync_queue', {
          ...item,
          status: 'failed',
          errorMessage: error,
        });
      }
    } catch (error) {
      await this.db.put('sync_queue', {
        ...item,
        status: 'failed',
        errorMessage: (error as Error).message,
      });
    }
  }

  // ========== CLEANUP & UTILS ==========

  async clearAllCache() {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.clear('cache');
  }

  async getStorageStats() {
    if (!this.db) throw new Error('DB not initialized');
    const bills = await this.db.count('bills');
    const customers = await this.db.count('customers');
    const products = await this.db.count('products');
    const expenses = await this.db.count('expenses');
    const queue = await this.db.count('sync_queue');

    return { bills, customers, products, expenses, queue };
  }

  async exportOfflineData() {
    if (!this.db) throw new Error('DB not initialized');
    return {
      bills: await this.db.getAll('bills'),
      customers: await this.db.getAll('customers'),
      products: await this.db.getAll('products'),
      expenses: await this.db.getAll('expenses'),
      syncQueue: await this.db.getAll('sync_queue'),
      timestamp: new Date().toISOString(),
    };
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.db) {
      this.db.close();
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();
