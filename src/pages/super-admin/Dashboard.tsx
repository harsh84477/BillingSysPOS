import React from "react";

const kpiData = [
	{ label: "Total users", value: 248, change: "+14 this month", trend: "up" },
	{ label: "Active subs", value: 184, change: "+8 this month", trend: "up" },
	{ label: "MRR", value: "₹1.8L", change: "+22% MoM", trend: "up" },
	{ label: "Active trials", value: 31, change: "≤7 days left", trend: "neutral" },
	{ label: "Open tickets", value: 7, change: "2 critical", trend: "down" },
];

const recentRegistrations = [
	{ shop: "Ramesh Stores", email: "ramesh@gmail.com", plan: "Pro", status: "Active", joined: "Apr 18", action: "View" },
	{ shop: "Priya Kirana", email: "priya.k@shop.in", plan: "Basic", status: "Trial", joined: "Apr 17", action: "View" },
	{ shop: "Mehta Wholesale", email: "mehta@biz.com", plan: "Pro", status: "Active", joined: "Apr 15", action: "View" },
	{ shop: "Sunita General", email: "sunita@store.in", plan: "Free", status: "Suspended", joined: "Mar 30", action: "Unsuspend" },
];

const planDistribution = [
	{ name: "Pro", percent: 54, color: "#534AB7", users: 134 },
	{ name: "Basic", percent: 30, color: "#4f94ef", users: 73 },
	{ name: "Trial", percent: 13, color: "#EF9F27", users: 31 },
	{ name: "Free", percent: 4, color: "#B4B2A9", users: 10 },
];

const liveActivity = [
	{ color: "#e24b4a", text: "Sunita General suspended", time: "10 min ago · by admin" },
	{ color: "#3B6D11", text: "Ramesh Stores → Pro plan", time: "1 hr ago" },
	{ color: "#4f94ef", text: "New user: Priya Kirana", time: "3 hr ago" },
	{ color: "#EF9F27", text: "Ticket #041 opened — critical", time: "5 hr ago" },
];

const SuperAdminDashboard = () => {
	return (
		<div className="space-y-8">
			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
				{kpiData.map((kpi, i) => (
					<div key={i} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col">
						<div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">{kpi.label}</div>
						<div className="text-2xl font-bold mb-1">{kpi.value}</div>
						<div className={
							`text-xs flex items-center gap-1 ${kpi.trend === "up" ? "text-green-700" : kpi.trend === "down" ? "text-red-600" : "text-gray-400"}`
						}>
							{kpi.trend === "up" && <span>▲</span>}
							{kpi.trend === "down" && <span>▼</span>}
							{kpi.change}
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Recent Registrations */}
				<div className="bg-white border rounded-lg p-4 shadow-sm">
					<div className="flex items-center justify-between mb-3">
						<div className="font-semibold text-base">Recent registrations</div>
						<button className="text-blue-600 text-xs font-medium">All users →</button>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-xs">
							<thead>
								<tr className="text-gray-500">
									<th className="px-2 py-1 text-left">Shop</th>
									<th className="px-2 py-1 text-left">Plan</th>
									<th className="px-2 py-1 text-left">Status</th>
									<th className="px-2 py-1 text-left">Joined</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{recentRegistrations.map((r, i) => (
									<tr key={i} className="border-t last:border-b-0">
										<td className="px-2 py-1">
											<div className="font-medium">{r.shop}</div>
											<div className="text-gray-400 text-[11px]">{r.email}</div>
										</td>
										<td><span className={`px-2 py-0.5 rounded text-white text-xs ${r.plan === "Pro" ? "bg-purple-700" : r.plan === "Basic" ? "bg-blue-500" : r.plan === "Trial" ? "bg-yellow-500" : "bg-gray-400"}`}>{r.plan}</span></td>
										<td><span className={`px-2 py-0.5 rounded text-xs ${r.status === "Active" ? "bg-green-100 text-green-700" : r.status === "Trial" ? "bg-blue-100 text-blue-700" : r.status === "Suspended" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"}`}>{r.status}</span></td>
										<td className="text-gray-400">{r.joined}</td>
										<td>
											<button className={`btn btn-xs ${r.action === "Unsuspend" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"} px-2 py-1 rounded text-xs`}>{r.action}</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Plan Distribution & Live Activity */}
				<div className="flex flex-col gap-4">
					<div className="bg-white border rounded-lg p-4 shadow-sm">
						<div className="font-semibold text-base mb-2">Plan distribution</div>
						{planDistribution.map((plan, i) => (
							<div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
								<div className="w-14 text-xs font-medium">{plan.name}</div>
								<div className="flex-1 h-2 bg-gray-200 rounded">
									<div style={{ width: `${plan.percent}%`, background: plan.color }} className="h-2 rounded"></div>
								</div>
								<div className="text-xs text-gray-500 w-16 text-right">{plan.users} users</div>
							</div>
						))}
					</div>
					<div className="bg-white border rounded-lg p-4 shadow-sm">
						<div className="font-semibold text-base mb-2">Live activity</div>
						{liveActivity.map((a, i) => (
							<div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
								<div className="w-2 h-2 rounded-full mt-1" style={{ background: a.color }}></div>
								<div>
									<div className="text-xs text-gray-800">{a.text}</div>
									<div className="text-[11px] text-gray-400">{a.time}</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SuperAdminDashboard;
