/**
 * Created by byrne on 09/01/2018.
 */

export function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

export function encodeHTML(source) {
  return String(source)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g,'&#92;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

export function formatTime(time) {
  var date = new Date(time);
  var month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
  var currentDate = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
  var hh = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
  var mm = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
  var ss = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
  var milliseconds = date.getMilliseconds();
  return `${date.getFullYear()}-${month}-${currentDate} ${hh}:${mm}:${ss}.${milliseconds}`;
}

export function messageDelay(message) {
  return Date.now() - new Date(message.timestamp).getTime();
  // return new Date(message.deliveredAt).getTime() - new Date(message.timestamp).getTime();
}

export function createLink(url) {
  return '<a target="_blank" href="' + encodeHTML(url) + '">' + encodeHTML(url) + '</a>';
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
