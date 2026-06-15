const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const ESEWA_ACCESS_KEY = 'LB0REg8HUSw3MTYrI1s6JTE8Kyc6JyAqJiA3MQ==';
const ESEWA_PRODUCT_CODE = 'INTENT';
const ESEWA_BOOK_URL = 'https://rc-checkout.esewa.com.np/api/client/intent/payment/book';
const ESEWA_STATUS_URL = 'https://rc-checkout.esewa.com.np/api/client/intent/payment/status';

const generateSignature = (message) => {
    const hmac = crypto.createHmac('sha256', ESEWA_ACCESS_KEY);
    hmac.update(message);
    return hmac.digest('base64');
};

router.post('/initiate', async (req, res) => {
    try {
        const { amount, orderId, customerName } = req.body;

        if (!amount || !orderId) {
            return res.status(400).json({ success: false, message: 'Amount and orderId are required' });
        }

        const parsedAmount = parseFloat(amount);
        const transaction_uuid = `txn-${orderId}-${Date.now()}`;
        const message = `product_code=${ESEWA_PRODUCT_CODE},amount=${parsedAmount},transaction_uuid=${transaction_uuid}`;
        const signature = generateSignature(message);

        const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

        const payload = {
            product_code: ESEWA_PRODUCT_CODE,
            amount: parsedAmount,
            transaction_uuid,
            signed_field_names: 'product_code,amount,transaction_uuid',
            signature,
            callback_url: `${BACKEND_URL}/esewa/callback`,
            redirect_url: `${FRONTEND_URL}/payment/success`,
            properties: {
                customer_name: customerName || 'Customer',
                remarks: `Order #${orderId} - Sykshades`,
            },
        };

        const response = await fetch(ESEWA_BOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const rawText = await response.text();
        console.log('eSewa raw response:', rawText);

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Invalid response from eSewa', raw: rawText });
        }

        // IP-200 or IP-201 both mean success
        if (data.code === 'IP-200' || data.code === 'IP-201') {
            return res.json({
                success: true,
                deeplink: data.data?.deeplink || data.deeplink,
                booking_id: data.data?.booking_id || data.booking_id,
                correlation_id: data.data?.correlation_id || data.correlation_id,
                transaction_uuid,
                message: data.message,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: data.error_message || data.message || `eSewa error: ${data.code}`,
                details: data,
            });
        }

    } catch (err) {
        console.error('eSewa initiate error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/callback', async (req, res) => {
    try {
        console.log('eSewa Callback received:', req.body);
        const { product_code, amount, reference_code, correlation_id, status, signature, signed_field_names } = req.body;

        if (!signed_field_names || !signature) {
            return res.status(400).json({ success: false, message: 'Missing signature fields' });
        }

        const fields = signed_field_names.split(',');
        const messageObj = { product_code, amount, reference_code, correlation_id, status };
        const message = fields.map(f => `${f}=${messageObj[f]}`).join(',');
        const expectedSignature = generateSignature(message);

        if (expectedSignature !== signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        if (status === 'SUCCESS') {
            console.log(`Payment SUCCESS — reference: ${reference_code}, amount: ${amount}`);
        }

        res.json({ success: true });

    } catch (err) {
        console.error('eSewa callback error:', err);
        res.status(500).json({ success: false });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { booking_id, correlation_id } = req.body;

        if (!booking_id || !correlation_id) {
            return res.status(400).json({ success: false, message: 'booking_id and correlation_id required' });
        }

        const message = `booking_id=${booking_id},product_code=${ESEWA_PRODUCT_CODE},correlation_id=${correlation_id}`;
        const signature = generateSignature(message);

        const payload = {
            booking_id,
            product_code: ESEWA_PRODUCT_CODE,
            correlation_id,
            signed_field_names: 'booking_id,product_code,correlation_id',
            signature,
        };

        const response = await fetch(ESEWA_STATUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const rawText = await response.text();
        console.log('eSewa verify response:', rawText);

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Invalid response from eSewa' });
        }

        res.json(data);

    } catch (err) {
        console.error('eSewa verify error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;