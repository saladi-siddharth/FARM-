module.exports = {
    apps: [
        {
            name: 'smart-farm-api',
            script: './server/cluster.js',
            instances: 'max', // Use all available CPU cores
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            // Performance optimizations
            max_memory_restart: '500M',
            min_uptime: '10s',
            max_restarts: 10,
            autorestart: true,
            watch: false,

            // Logging
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Advanced features
            kill_timeout: 5000,
            listen_timeout: 3000,
            shutdown_with_message: true,

            // Health monitoring
            instance_var: 'INSTANCE_ID',

            // Environment-specific settings
            node_args: '--max-old-space-size=4096'
        }
    ],

    deploy: {
        production: {
            user: 'node',
            host: 'your-server.com',
            ref: 'origin/main',
            repo: 'https://github.com/saladi-siddharth/FARM-.git',
            path: '/var/www/smart-farm',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production'
            }
        }
    }
};
