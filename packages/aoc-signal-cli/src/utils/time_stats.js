/**
 * Created by byrne on 22/01/2018.
 */
import debug from 'debug';

const dbg = debug('app:time_stats');


export const eventBegin = (stats, key) => {
  if(!stats[key]) {
    stats[key] = {};
  }
  stats[key].begin = Date.now();
};

export const eventEnd = (stats, key) => {
  if(!stats[key]) {
    dbg(`WARN ${key} not found`);
    return;
  }

  stats[key].end = Date.now();
  stats[key].cost = stats[key].end - stats[key].begin;
};

export const eventCost = (stats, key) => {
  return stats[key] ? stats[key].cost : 0;
};

const samples = {};
export function addSample(key, value, excludeZero = true) {
  let sample;
  if(samples.hasOwnProperty(key)) {
    sample = samples[key];
  } else {
    sample = {
      sum: 0,
      cnt: 0,
      avg: 0,
    };
    samples[key] = sample;
  }
  if(!excludeZero || value !== 0) {
    sample.sum += value;
    sample.cnt += 1;
    sample.avg = sample.sum / sample.cnt;
  }
}

export function getSample(key) {
  return samples[key];
}
