/**
 * Created by byrne on 26/01/2018.
 */
require('es6-promise').polyfill();
require('isomorphic-fetch');

export const logstash = (data) => {
  const serverCfg = {
    host: 'http://collector.saybot.com/1',
    token: '7dHFp289xqqyhy68Ce3X3Rnz',
  };
  const postUrl = `${serverCfg.host}/${serverCfg.token}/data_array`;
  return fetch(postUrl, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  });
};
