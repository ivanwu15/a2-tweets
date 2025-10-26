let tweet_array = [];

function countBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function mean(nums) {
  const v = nums.filter(x => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function parseTweets(runkeeper_tweets) {
	//Do not proceed if no tweets loaded
	if (!Array.isArray(runkeeper_tweets)) {
		window.alert('No tweets returned');
        return;
	}
	
	tweet_array = runkeeper_tweets.map(function(tweet) {
		return new Tweet(tweet.text, tweet.created_at);
	});

  // Use only completed events for activities/distances
  const completed = tweet_array.filter(t => t.source === 'completed_event');

  // ===== A) Distinct activity types & Top-3 by count =====
  const counts = Array.from(countBy(completed, t => t.activityType), ([activity, count]) => ({ activity, count }))
    .filter(d => d.activity !== 'unknown')
    .sort((a, b) => b.count - a.count);

  const top3 = counts.slice(0, 3);                   // Top-3 activity types by frequency
  const topDomain = top3.map(d => d.activity);       // Keep colors consistent across charts

  // Fill the sentence placeholders (IDs come from activities.html)
  document.getElementById('numberActivities').innerText = String(counts.length);
  document.getElementById('firstMost').innerText = top3[0] ? top3[0].activity : 'N/A';
  document.getElementById('secondMost').innerText = top3[1] ? top3[1].activity : 'N/A';
  document.getElementById('thirdMost').innerText = top3[2] ? top3[2].activity : 'N/A';

  // ===== B) Of those three, which tends to be longest/shortest (by mean distance)? =====
  const distancesByType = {};
  top3.forEach(d => distancesByType[d.activity] = []);
  completed.forEach(t => {
    if (distancesByType[t.activityType]) distancesByType[t.activityType].push(t.distance);
  });

  const means = Object.entries(distancesByType)
    .map(([activity, arr]) => ({ activity, mean: mean(arr) }))
    .sort((a, b) => b.mean - a.mean);

  document.getElementById('longestActivityType').innerText = means[0]?.activity || 'N/A';
  document.getElementById('shortestActivityType').innerText = means[means.length - 1]?.activity || 'N/A';

  // ===== C) Longest activities on weekday or weekend? (for top-3 combined) =====
  const topNames = new Set(top3.map(d => d.activity));
  const distRows = completed
    .filter(t => topNames.has(t.activityType) && t.distance > 0)
    .map(t => ({ Weekday: t.weekdayName, Distance: t.distance, Activity: t.activityType }));

  const dowOrder = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const perDay = dowOrder.map(name => {
    const ds = distRows.filter(r => r.Weekday === name).map(r => r.Distance);
    return { name, mean: mean(ds) };
  });
  const bestDow = perDay.reduce((best, cur) => cur.mean > best.mean ? cur : best, { name: 'Sun', mean: -1 }).name;
  const weekendSet = new Set(['Sun','Sat']);
  document.getElementById('weekdayOrWeekendLonger').innerText = weekendSet.has(bestDow) ? 'the weekend' : 'weekdays';

  // ======================= Vega-Lite Charts =======================

  // Chart 1: Number of completed tweets per activity type (bar)
  const barData = counts.map(d => ({ Activity: d.activity, Count: d.count }));
  const barSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'Number of completed tweets per activity type',
    data: { values: barData },
    mark: 'bar',
    encoding: {
      x: { field: 'Activity', type: 'nominal', sort: '-y' },
      y: { field: 'Count', type: 'quantitative' },
      tooltip: [{ field: 'Activity' }, { field: 'Count' }]
    },
    width: 600, height: 300
  };
  vegaEmbed('#activityVis', barSpec, { actions: false });

  // Chart 2: Raw distances by DOW for top-3 (points)
  const rawSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    description: 'Raw distances by day of week for top-3 activities.',
    data: { values: distRows },
    mark: { type: 'point', tooltip: true },
    encoding: {
      x: { field: 'Weekday', type: 'ordinal', sort: dowOrder },
      y: { field: 'Distance', type: 'quantitative', title: 'Distance (mi)' },
      color: { field: 'Activity', type: 'nominal' }
    },
    width: 600, height: 300
  };

  // Chart 3: Mean distance by DOW for top-3 (bars)
  const meanSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  description: 'Mean distance by day of week for top-3 activities (points).',
  data: { values: distRows }, // [{Weekday, Distance, Activity}]
  // Compute the mean once and reuse it for plotting
  transform: [
    {
      aggregate: [{ op: 'mean', field: 'Distance', as: 'MeanDistance' }],
      groupby: ['Weekday', 'Activity']
    }
  ],
  mark: { type: 'point', tooltip: true },
  encoding: {
    x: {
      field: 'Weekday',
      type: 'ordinal',
      sort: dowOrder,               // ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
      title: 'time (day)'
    },
    y: {
      field: 'MeanDistance',
      type: 'quantitative',
      title: 'Mean of distance'
    },
    color: {
      field: 'Activity',
      type: 'nominal',
      // Keep colors consistent with the raw points chart
      scale: { domain: topDomain }
    }
  },
  width: 600,
  height: 300
};

  // Initial: show raw points, hide aggregated
  document.getElementById('distanceVisAggregated').style.display = 'none';
  vegaEmbed('#distanceVis', rawSpec, { actions: false });
  vegaEmbed('#distanceVisAggregated', meanSpec, { actions: false });

  // Toggle with the button id="aggregate"
  const btn = document.getElementById('aggregate');
  btn.textContent = 'Show means';
  btn.addEventListener('click', () => {
    const agg = document.getElementById('distanceVisAggregated');
    const raw = document.getElementById('distanceVis');
    const showingMeans = agg.style.display !== 'none';
    if (showingMeans) {
      agg.style.display = 'none';
      raw.style.display = 'block';
      btn.textContent = 'Show means';
    } else {
      raw.style.display = 'none';
      agg.style.display = 'block';
      btn.textContent = 'Show raw points';
    }
  });
}

//Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function (event) {
	loadSavedRunkeeperTweets().then(parseTweets);
});