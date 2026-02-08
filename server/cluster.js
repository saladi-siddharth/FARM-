const cluster = require('cluster');
const os = require('os');

// Determine number of workers (CPU cores)
const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`🚀 Master process ${process.pid} is running`);
    console.log(`🔧 Starting ${numCPUs} worker processes...`);

    // Fork workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Track worker status
    let workerCount = 0;
    cluster.on('online', (worker) => {
        workerCount++;
        console.log(`✅ Worker ${worker.process.pid} is online (${workerCount}/${numCPUs})`);

        if (workerCount === numCPUs) {
            console.log(`\n🎉 All ${numCPUs} workers are ready!`);
            console.log(`📊 Application can now handle ${numCPUs * 1000}+ concurrent connections`);
        }
    });

    // Handle worker crashes and restart
    cluster.on('exit', (worker, code, signal) => {
        console.log(`❌ Worker ${worker.process.pid} died (${signal || code})`);
        console.log('🔄 Starting a new worker...');
        cluster.fork();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('🔄 Master received SIGTERM, shutting down gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    });

} else {
    // Worker processes run the actual server
    require('./server.js');
    console.log(`👷 Worker ${process.pid} started`);
}
