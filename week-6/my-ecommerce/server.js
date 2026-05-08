const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 토스 테스트 상점 키 (환경변수로 덮어쓸 수 있음)
const CLIENT_KEY = process.env.TOSS_CLIENT_KEY || 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
const SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

app.use(express.json());
app.use(express.static(__dirname, { index: 'index.html' }));

// 메모리 기반 주문 저장소 (실제 운영에서는 DB 사용)
const pendingOrders = new Map();

// 클라이언트 키만 노출 (시크릿 키는 절대 노출 금지)
app.get('/api/config', (req, res) => {
  res.json({ clientKey: CLIENT_KEY });
});

// 결제 요청 직전: 서버에 주문 정보 미리 저장 → confirm 시 금액 위변조 검증용
app.post('/api/payments/prepare', (req, res) => {
  const { orderId, amount, orderName, items } = req.body;
  if (!orderId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  pendingOrders.set(orderId, {
    amount,
    orderName,
    items,
    createdAt: Date.now(),
    status: 'pending',
  });
  res.json({ ok: true });
});

// 결제 승인: 토스 서버에 시크릿키로 confirm 요청
app.post('/api/payments/confirm', async (req, res) => {
  const { paymentKey, orderId, amount } = req.body;
  if (!paymentKey || !orderId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'invalid_request', message: '필수 파라미터가 누락되었습니다.' });
  }

  const pending = pendingOrders.get(orderId);
  if (!pending) {
    return res.status(404).json({ error: 'order_not_found', message: '존재하지 않는 주문입니다.' });
  }
  if (pending.status === 'paid') {
    return res.status(400).json({ error: 'already_paid', message: '이미 결제가 완료된 주문입니다.' });
  }
  // 핵심 보안 체크: 클라이언트가 보낸 amount와 서버 저장 amount 일치 여부
  if (pending.amount !== amount) {
    return res.status(400).json({ error: 'amount_mismatch', message: '결제 금액이 일치하지 않습니다.' });
  }

  try {
    const auth = Buffer.from(SECRET_KEY + ':').toString('base64');
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Toss confirm error:', data);
      return res.status(response.status).json({
        error: data.code || 'toss_error',
        message: data.message || '결제 승인에 실패했습니다.',
      });
    }

    pending.status = 'paid';
    pending.paidAt = Date.now();
    pending.payment = data;

    res.json({
      orderName: pending.orderName,
      items: pending.items,
      payment: {
        method: data.method,
        approvedAt: data.approvedAt,
        totalAmount: data.totalAmount,
        receiptUrl: data.receipt && data.receipt.url,
      },
    });
  } catch (err) {
    console.error('confirm exception:', err);
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// SPA 라우팅 fallback: 새로고침/직접접근 시에도 index.html 반환
app.get(['/checkout', '/payments/success', '/payments/fail'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ 도담 (DODAM) 서버가 시작되었습니다`);
  console.log(`   → http://localhost:${PORT}`);
});
