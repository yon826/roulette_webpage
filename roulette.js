document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  let prizes = [];
  const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f87171", "#a78bfa", "#4ade80"];
  let currentAngle = 0;

  fetch('/prizes')
    .then(res => res.json())
    .then(data => {
      prizes = data.map(p => p.name);
      drawWheel();
    });

  function drawWheel(angle = 0) {
    const arc = 2 * Math.PI / prizes.length;
    ctx.clearRect(0, 0, 300, 300);
    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(angle);
    for (let i = 0; i < prizes.length; i++) {
      const startAngle = -i * arc;
      const endAngle = startAngle - arc;
      ctx.beginPath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 150, startAngle, endAngle, true);
      ctx.fill();
      ctx.save();
      ctx.rotate(startAngle - arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      ctx.fillText(prizes[i], 140, 10);
      ctx.restore();
    }
    ctx.restore();
  }

  function spinToIndex(index) {
    const arc = 2 * Math.PI / prizes.length;
    const fullRotations = 5 * 2 * Math.PI;
    const stopAngle = index * arc + arc / 2 - Math.PI / 2;
    const randomOffset = (Math.random() - 0.5) * arc * 0.2;
    const targetAngle = fullRotations + stopAngle + randomOffset;
    const duration = 4000;
    const start = performance.now();

    function animate(time) {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentAngle = eased * targetAngle;
      drawWheel(currentAngle);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  let verified = false;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('spinBtn').classList.add('disabled');

  document.getElementById('sendCodeBtn').addEventListener('click', () => {
    const name = document.getElementById('nameInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    if (!name || !phone) return alert('이름과 전화번호를 입력해주세요.');
    fetch('/check_participation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    })
      .then(res => res.json())
      .then(data => {
        if (data.exists) return alert('이미 참여하셨습니다.');
        return fetch('/send_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
      })
      .then(res => res?.json())
      .then(data => {
        if (data?.success) alert('인증번호를 전송했습니다.');
      });
  });

  document.getElementById('verifyCodeBtn').addEventListener('click', () => {
    const phone = document.getElementById('phoneInput').value.trim();
    const code = document.getElementById('codeInput').value.trim();
    if (!phone || !code) return alert('전화번호와 인증번호를 모두 입력해주세요.');
    fetch('/verify_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          verified = true;
          const spinBtn = document.getElementById('spinBtn');
          spinBtn.disabled = false;
          spinBtn.classList.remove('disabled');
          alert('인증 성공! 이제 룰렛을 돌릴 수 있습니다.');
        } else {
          alert('인증번호가 일치하지 않습니다.');
        }
      });
  });

  document.getElementById('spin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!verified) return alert('먼저 인증을 완료해주세요.');
    const name = document.getElementById('nameInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    fetch('/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name, phone })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          spinToIndex(data.index);
          setTimeout(() => showResult(data.prize, data.card_image), 4200);
        } else {
          alert(data.message || '오류가 발생했습니다.');
        }
      });
  });

  function showResult(prize, cardImageUrl) {
    const modal = document.getElementById('resultModal');
    const modalText = document.getElementById('modalPrizeText');
    const modalImg = document.getElementById('modalPrizeImage');
    const downloadLink = document.getElementById('downloadLink');
    const closeBtn = document.getElementById('closeBtn');

    modalText.textContent = `${prize} 무료 교환권에 당첨되셨습니다!`;
    modalImg.src = cardImageUrl;
    downloadLink.href = cardImageUrl;
    closeBtn.disabled = true;
    closeBtn.style.opacity = 0.5;

    modal.style.display = 'flex';

    downloadLink.onclick = () => {
      closeBtn.disabled = false;
      closeBtn.style.opacity = 1;
    };

    closeBtn.onclick = () => {
      if (!closeBtn.disabled) {
        modal.style.display = 'none';
      }
    };
  }
});
