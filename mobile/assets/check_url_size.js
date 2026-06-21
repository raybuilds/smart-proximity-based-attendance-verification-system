const https = require('https');

const url = 'https://expo.dev/artifacts/eas/53Kv9ppNXeWh8MtPf1jOmM_FtYHqQwzSBKBXr_VoDdg.apk';

function getUrlSize(targetUrl) {
  https.request(targetUrl, { method: 'HEAD' }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      // Follow redirect
      getUrlSize(res.headers.location);
      return;
    }
    const bytes = parseInt(res.headers['content-length'], 10);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    console.log(`Size: ${bytes} bytes (${mb} MB)`);
  }).on('error', (err) => {
    console.error(err);
  }).end();
}

getUrlSize(url);
