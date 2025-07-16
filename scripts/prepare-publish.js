const fs = require('fs');
const path = require('path');

// Paths
const projectDir = process.cwd();
const distDir = path.join(projectDir, 'build');
const srcDir = path.join(projectDir, 'src');
const pluginsDir = path.join(projectDir, 'plugins');
const pluginDistDir = path.join(pluginsDir, 'dist');

// Helper function to copy files/directories
function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const items = fs.readdirSync(src);
        items.forEach(item => {
            copyRecursive(path.join(src, item), path.join(dest, item));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function prepare() {
    console.log('🚀 Starting publish preparation...');

    // Clean previous plugins directory
    if (fs.existsSync(pluginsDir)) {
        console.log('🧹 Cleaning existing plugins directory...');
        fs.rmSync(pluginsDir, { recursive: true, force: true });
    }

    // Create plugins directory structure
    console.log('📁 Creating plugins/dist directory...');
    fs.mkdirSync(pluginDistDir, { recursive: true });

    // Check if dist directory exists (it should be created by `npm run build`)
    if (!fs.existsSync(distDir)) {
        console.error('❌ build directory not found. Make sure `npm run build` runs before this script.');
        process.exit(1);
    }

    // Copy dist folder to plugins/dist
    console.log('📦 Copying build folder to plugins/dist...');
    copyRecursive(distDir, pluginDistDir);

    // Copy src folder to plugins/dist
    console.log('📂 Copying src folder to plugins/dist...');
    copyRecursive(srcDir, pluginDistDir);

    console.log('✅ Publish preparation completed successfully!');
}

prepare();