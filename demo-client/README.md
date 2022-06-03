# Demo Client for node-rtsp-to-fmp4

Use this client to test data posted to a client to the node-rtsp-to-fmp4 server.

## Usage

### Connect to a stream

```bash
curl -X POST -H "content-type: application/json" -d '{"url": "http://localhost:4000/api/streams"}' http://localhost:8083/api/streams/Stream1/connect
```

### Disconnect from a stream

```bash
curl -X POST -H "content-type: application/json" -d '{"url": "http://localhost:4000/api/streams"}' http://localhost:8083/api/streams/Stream1/disconnect
```

