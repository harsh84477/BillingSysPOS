import React from "react";
import PlansTab from "@/components/super-admin/PlansTab";
import BusinessTab from "@/components/super-admin/BusinessTab";

const SuperAdminBusinesses = () => {
	// Fetch plans to pass to BusinessTab
	// PlansTab already fetches plans, but we need to fetch here for prop
	// We'll use a simple wrapper for now
	const [plans, setPlans] = React.useState<any[]>([]);
	const [loading, setLoading] = React.useState(true);

	React.useEffect(() => {
		let mounted = true;
		(async () => {
			const { data, error } = await (await import("@/integrations/supabase/client")).supabase
				.from('subscription_plans')
				.select('*')
				.order('price');
			if (mounted) {
				setPlans(data || []);
				setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, []);

	if (loading) return <div className="p-8 text-center text-muted-foreground">Loading businesses...</div>;

	return <BusinessTab plans={plans} />;
};

export default SuperAdminBusinesses;
