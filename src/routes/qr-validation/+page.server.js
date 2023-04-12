/** @type {import('./$types').PageServerLoad} */
export async function load({ url }) {
    const purchaseId = url.searchParams.get('id');
    return {
        purchaseId: purchaseId,
    };
};