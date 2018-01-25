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
}

export const eventEnd = (stats, key) => {
  if(!stats[key]) {
    dbg(`WARN ${key} not found`);
    return;
  }

  stats[key].end = Date.now();
  stats[key].cost = stats[key].end - stats[key].begin;
}

export const eventCost = (stats, key) => {
  return stats[key] && stats[key].cost;
}

const samples = {};
export function addSample(key, value) {
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
  sample.sum += value;
  sample.cnt += 1;
  sample.avg = sample.sum / sample.cnt;
}

export function getSample(key) {
  return samples[key];
}
