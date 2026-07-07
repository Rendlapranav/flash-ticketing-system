async function runConcurrencyTest() {
  console.log('🚀 Starting Concurrency Load Test...');

  const eventsRes = await fetch('http://localhost:5000/api/events');
  const events = await eventsRes.json();

  if (!Array.isArray(events) || events.length === 0) {
    console.error('❌ No events found. Run `npm run seed` in backend/ first.');
    return;
  }

  const eventId = events[0]._id;
  const targetSeat = 'C5';
  const url = 'http://localhost:5000/api/seats/lock';

  console.log(`Firing 5 simultaneous requests to lock seat ${targetSeat} on "${events[0].name}"...\n`);

  // Create an array of 5 identical lock requests from 5 different dummy users
  const requests = Array.from({ length: 5 }).map((_, index) => {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        seatNumber: targetSeat,
        userId: `dummy_user_${index + 1}`
      })
    })
    .then(async (res) => {
      const data = await res.json();
      return {
        userId: `dummy_user_${index + 1}`,
        status: res.status,
        message: data.message
      };
    })
    .catch((err) => {
      return {
        userId: `dummy_user_${index + 1}`,
        status: 500,
        message: err.message
      };
    });
  });

  // Fire them all at the exact same time
  const results = await Promise.all(requests);

  // Tally the results
  let successCount = 0;
  let conflictCount = 0;

  console.log('📊 Results:');
  results.forEach(result => {
    if (result.status === 200) {
      console.log(`✅ [${result.userId}] 200 OK - ${result.message}`);
      successCount++;
    } else if (result.status === 409) {
      console.log(`❌ [${result.userId}] 409 Conflict - ${result.message}`);
      conflictCount++;
    } else {
      console.log(`⚠️ [${result.userId}] ${result.status} - ${result.message}`);
    }
  });

  console.log('\n--- Summary ---');
  console.log(`Total Requests: ${results.length}`);
  console.log(`Successful Locks (Expected: 1): ${successCount}`);
  console.log(`Rejected Locks (Expected: 4): ${conflictCount}`);

  if (successCount === 1 && conflictCount === 4) {
    console.log('\n✅ TEST PASSED: Race conditions successfully blocked!');
  } else {
    console.log('\n❌ TEST FAILED: Race condition detected or server error.');
  }
}

runConcurrencyTest();
