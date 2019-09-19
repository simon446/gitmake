#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const util = require('util');
const writeFileAsync = util.promisify(fs.writeFile);
const readFileAsync = util.promisify(fs.readFile);
const existsAsync = util.promisify(fs.exists);
const readline = require('readline');
const prompt = readline.createInterface({input: process.stdin,output: process.stdout});
const input = function(q) {
    return new Promise((res, rej) => {
        prompt.question(q, answer => {
            res(answer);
        });
    });
}
const mkdirp = util.promisify(require('mkdirp'));
const GithubInit = require('./github_api');

let credDirPath = path.join(require('os').homedir(), '.github_token');
let credFilePath = path.join(credDirPath, 'cred.json');

async function main() {
    const name = process.argv.length <= 2 ? path.basename(path.resolve()) : process.argv[2];
    let auth = null;

    if (!await existsAsync(credFilePath)) { // Create credentials file
        const token = await input(`No token found. Go to https://github.com/settings/tokens and create a token with all repo access checked except delete_repo. Paste username:token here: `);

        await mkdirp(credDirPath);
        await writeFileAsync(credFilePath, JSON.stringify(token));

        console.log(`Token saved in ${credFilePath}.`);
        auth = token;
    } else {
        auth = JSON.parse(await readFileAsync(credFilePath, 'utf-8'));
    }

    const github = new GithubInit(auth);

    try {
        await github.initPrivateRepo(name)
    } catch (err) {
        console.log(err);
    }

    prompt.close();
}

main();




