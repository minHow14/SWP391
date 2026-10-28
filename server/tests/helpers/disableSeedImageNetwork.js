// D:/SWP391/SWP391/server/tests/helpers/disableSeedImageNetwork.js
// Exercise the seed runner's offline image handling without contacting an external service.
globalThis.fetch = async () => {
  throw new Error('Image downloads are offline during seed integration tests.');
};
