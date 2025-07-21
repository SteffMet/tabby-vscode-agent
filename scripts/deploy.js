const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths
const projectDir = process.cwd();
const buildDir = path.join(projectDir, 'build');
const srcDir = path.join(projectDir, 'src');
const packageJsonPath = path.join(projectDir, 'package.json');
const readmePath = path.join(projectDir, 'README.md');
const changelogPath = path.join(projectDir, 'CHANGELOG.md');

// New Target plugin directory
const pluginDir = path.join(os.homedir(), 'AppData', 'Roaming', 'tabby', 'plugins', 'node_modules', 'tabby-copilot');
const pluginDistDir = path.join(pluginDir, 'plugins', 'dist');

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

// Main deployment function
function deploy() {
    console.log('🚀 Starting deployment...');

    // Check if build directory exists
    if (!fs.existsSync(buildDir)) {
        console.error('❌ build directory not found. Please run npm run build first.');
        process.exit(1);
    }

    // Remove existing plugin directory
    if (fs.existsSync(pluginDir)) {
        console.log('🧹 Cleaning existing plugin directory...');
        fs.rmSync(pluginDir, { recursive: true, force: true });
    }

    // Create plugin directory and dist subdirectory
    console.log('📁 Creating plugin directory structure...');
    fs.mkdirSync(pluginDistDir, { recursive: true });

    // Copy build folder contents to plugin/dist
    console.log('📦 Copying build folder to dist...');
    copyRecursive(buildDir, pluginDistDir);

    // Copy src folder contents to plugin/dist
    console.log('📂 Copying src folder to dist...');
    if (fs.existsSync(srcDir)) {
        copyRecursive(srcDir, pluginDistDir);
    }

    // Copy package.json
    console.log('📄 Copying package.json...');
    fs.copyFileSync(packageJsonPath, path.join(pluginDir, 'package.json'));

    // Copy README.md if it exists
    if (fs.existsSync(readmePath)) {
        console.log('📄 Copying README.md...');
        fs.copyFileSync(readmePath, path.join(pluginDir, 'README.md'));
    }

    // Copy CHANGELOG.md if it exists
    if (fs.existsSync(changelogPath)) {
        console.log('📄 Copying CHANGELOG.md...');
        fs.copyFileSync(changelogPath, path.join(pluginDir, 'CHANGELOG.md'));
    }

    console.log('✅ Deployment completed successfully!');
    console.log(`📍 Plugin installed at: ${pluginDir}`);
    console.log('');
    console.log('🔄 Please restart Tabby to load the plugin.');
}

// Run deployment
deploy();
