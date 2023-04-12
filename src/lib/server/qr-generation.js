import { PUBLIC_BASE_URL } from '$env/static/public';

export const generateQrUrl = function (databasePurchaseId, additionalRoute = '/') {
    const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/?data=';
    const redirectUrl = `${PUBLIC_BASE_URL}${additionalRoute}?id=${databasePurchaseId}`;

    const completeUrl = qrApiUrl + encodeURI(redirectUrl);
    return completeUrl;
};
