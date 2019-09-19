const https = require('https');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const writeFileAsync = util.promisify(fs.writeFile);
const readdirAsync = util.promisify(fs.readdir);
const renameAsync = util.promisify(fs.rename);


async function renameCase(correctName) {
    const lst = await readdirAsync('./');
    for (let file of lst) {
        if (file.toLowerCase() === correctName.toLowerCase()) {
            await renameAsync(file, correctName);
            return true;
        }
    }
    return false;
}

class GithubInit {
    constructor(auth) {
        this.auth = auth;
    }

    api_v3(api_path, data={}) {
        return new Promise((resolve, reject) => {
            const match = /^([A-Z]+) (.*)$/.exec(api_path);
            if (!match) {
                reject('Invalid api_path');
                return;
            }
            const path = match[2];
            const method = match[1];
            const queryData = JSON.stringify(data);
    
            const req = https.request(`https://api.github.com${path}`, {
                auth: this.auth, 
                method,
                headers: {
                    'user-agent': '',
                    'accept': 'application/vnd.github.v3+json'
                }
            }, res => {
                res.setEncoding('utf8');
            
                let buff = Buffer.alloc(0);
            
                res.on('data', (chunk) => {
                    buff = Buffer.concat([buff, Buffer.from(chunk)]);
                });
                res.on('end', () => {
                    resolve(JSON.parse(buff.toString()));
                });
                
            });
            
            req.on('error', err => {
                reject(err);
            });
            
            req.write(queryData);
            req.end();
        });
    }

    async createPrivateRepo(name) {
        const response = await this.api_v3('POST /user/repos', {
            name: name,
            private: true
        });

        if (response.errors) return false;
        return response.ssh_url;
    }

    async initPrivateRepo(name) {
        const ssh_url = await this.createPrivateRepo(name);
        await renameCase('README.md');
        try {await writeFileAsync('README.md', `# ${name}
`, { flag: "wx" });} catch (err) {}
        if (ssh_url) this.cmd(`git init && git add README.md && git commit -m "Initial commit" && git remote add origin ${ssh_url} && git push -u origin master`);
        else throw new Error('Cannot create remote repo. Check if repo already exists.');
    }

    async cmd(command) {
        let stdout, stderr;
        try {
            const res = await exec(command);
            stdout = res.stdout;
            stderr = res.stderr;
            console.log(stdout);
        } catch (err) {
            console.log(err.message);
        }
    }
}

module.exports = GithubInit;