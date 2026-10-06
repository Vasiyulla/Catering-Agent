import axios from 'axios';

async function testSimulate() {
  try {
    console.log('Sending simulation message to Render: https://catering-agent.onrender.com/webhook/simulate');
    const res = await axios.post(
      'https://catering-agent.onrender.com/webhook/simulate',
      {
        from: '918971286950',
        name: 'Vasiyulla',
        message: 'Hi, I need catering for 30 people on 24th October',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
    console.log('Response Status:', res.status);
    console.log('Response Data:', res.data);
  } catch (err) {
    console.error('Simulation Error:', err.response?.data || err.message);
  }
}

testSimulate();
