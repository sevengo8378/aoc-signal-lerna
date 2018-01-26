/**
 * Created by byrne on 26/01/2018.
 */
require('es6-promise').polyfill();
require('isomorphic-fetch');

export const logstash = (data) => {
  const serverCfg = {
    host: 'http://collector.saybot.com/1',
    token: 'Aq7XS1JQtfhPQ8ja8L2N94pU',
  };
  const postUrl = `${serverCfg.host}/${serverCfg.token}/data_array`;
  return fetch(postUrl, data);
};
