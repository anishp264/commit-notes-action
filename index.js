const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');

const commitText = "Commit";
const prText = "PR";

//This function fetches the commit notes
async function fetchCommitNotes(owner, repo, pullRequestNumber){
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN 
  });

  try {

    const prResponse = await octokit.pulls.get({
        owner: owner,
        repo: repo,
        pull_number: pullRequestNumber,
      });

    const response = await octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: pullRequestNumber
    });

    const mergeNotes = [];
    const mergeNote = {};
    if(isStringInputValid(prResponse.data.title)){      
      mergeNotes.push(prResponse.data.title);
    }

    const commits = response.data.map(commit => {
      const container = {};
      container.message = commit.commit.message;
      container.committerName = commit.commit.committer.name;
      container.committerEmail = commit.commit.committer.email;
      container.commitDate = commit.commit.committer.date;
      container.commitSha = commit.sha;
      container.commitType = commitText;
      if(container.committerName.toLowerCase() === "github")
      {
        container.commitType = prText;
        if(isStringInputValid(commit.commit.message)){
          container.message = commit.commit.message.split("-pr\n\n")[1];
        }        
      }
      else{
        if(commit.commit.message.includes("\n\n")){
          container.message = `${commit.commit.message.split("\n\n")[0]}   ${commit.commit.message.split("\n\n")[1]}`
        }
      }
      return container;
    });

    let markdownContent = `# Merge Notes`;

    let commitMarkDownContent = `# Commit Notes`;
    
    commits.forEach((commit) => {
      if(commit.commitType == commitText){
        commitMarkDownContent += `
        - ${commit.commitDate} | ${commit.commitSha} | ${commit.message} [${commit.committerEmail}]`;
      }
      else{
        mergeNotes.push(commit.message);
      }
    });

    mergeNotes.forEach((mergeNote) => {
      markdownContent += `
      ## ${mergeNote}`;
    });

    markdownContent += `
    ---
    ${commitMarkDownContent}
    ---`;

    return markdownContent;
  } catch (error) {
    console.setFailed('Error retrieving commit messages:', error);
    return [];
  }
}

async function fetchCommitNotesV1(owner, repo, pullRequestNumber){
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN 
  });

  try {
    const shas = [];

    let markdownContent = `# Merge Notes`;

    const pullRequest = await getPullRequest(octokit, pullRequestNumber);
    markdownContent += getPullRequestMarkDownContent(pullRequest);

    const response = await octokit.pulls.listCommits({
      owner,
      repo,
      pull_number: pullRequestNumber
    });

    const commits = response.data.map(commit => {
      const container = {};
      container.message = commit.commit.message;
      container.committerName = commit.commit.committer.name;
      container.committerEmail = commit.commit.committer.email;
      container.commitDate = commit.commit.committer.date;
      container.commitSha = commit.sha;
      container.commitType = commitText;
      if(container.committerName.toLowerCase() === "github")
      {
        container.commitType = prText;             
      }
      else{
        if(commit.commit.message.includes("\n\n")){
          container.message = `${commit.commit.message.split("\n\n")[0]}   ${commit.commit.message.split("\n\n")[1]}`
        }
      }
      return container;
    });

    let commitMarkDownContent = `# Commit Notes`;
    
    commits.forEach((commit) => {
      if(commit.commitType == commitText){
        commitMarkDownContent += `
        - ${commit.commitDate} | ${commit.commitSha} | ${commit.message} [${commit.committerEmail}]`;
      }
      else{
        //remove below line
        commitMarkDownContent += `
        - ${commit.commitDate} | ${commit.commitSha} | ${commit.message} [${commit.committerEmail}]`;
        //ends
        shas.push(commit.commitSha);
      }
    });  

    if(shas.length > 0){
      const result = await getPRMarkDownContentBySHAs(octokit,shas);
      console.log(result);
      markdownContent += `${result}`;
    }   

    

    markdownContent += `
    ---
    ${commitMarkDownContent}
    ---`;

    return markdownContent;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

async function getPRMarkDownContent(octokit, prs){
  let mdContent = ``;
  for (const prNumber of prs){
    const pullRequest = await getPullRequest(octokit, prNumber);
    mdContent += getPullRequestMarkDownContent(pullRequest);
  }
  return mdContent;
}

async function getPRMarkDownContentBySHAs(octokit, shas){  
  let mdContent = ``;
  const pullRequests = await getPullRequestList(octokit);
  for (const sha of shas){
    const pullRequest = pullRequests.find(obj => {return obj.sha === sha});
    mdContent += getPullRequestMarkDownContent(pullRequest);
  }
  return mdContent;
}

function getPullRequestMarkDownContent(pullRequest){
  let mdContent = ``;
  if(isStringInputValid(pullRequest.title)){
    mdContent += `## ${pullRequest.title}
    `;
  }
  if(isStringInputValid(pullRequest.title)){
    mdContent += `${pullRequest.body}
    `;
  }
  return mdContent;
}

function getPRNumber(){
  const githubRef = process.env.GITHUB_REF;
  const pullRequestRegex = /refs\/pull\/(\d+)\/merge/;
  const match = githubRef.match(pullRequestRegex);
  const pullNumber = match ? match[1] : null;
  return pullNumber;
}

function getPRNumberFromCommitNote(commitNote){
  const regex = /#(\w+)/;
  const match = commitNote.match(regex);
  const prNumber = match ? match[1] : null;
  return prNumber;
}

function isStringInputValid(stringInput){
  return (!stringInput || stringInput.trim() === "") ? false : true;
}

async function getPullRequest(octokit, prNumber){
  try{
    const response = await octokit.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: prNumber,
    });
    const mergeNote = {};
    mergeNote.title = response.data.title;
    mergeNote.body = response.data.body;
    return mergeNote;
  }catch(error){
    console.setFailed('Error retrieving merge notes:', error);
    return [];
  }
}

async function getPullRequestList(octokit){
  try{
    const response = await octokit.pulls.list({
      owner: owner,
      repo: repo,
      state: 'all',
    });
    const pullRequests = response.data.map(pullRequestCont => {
      const pullRequest = {};
      pullRequest.title = pullRequestCont.title;
      pullRequest.body = pullRequestCont.body;
      pullRequest.sha = pullRequestCont.merge_commit_sha;
      return pullRequest;
    });
    return pullRequests;    
  }catch(error){
    console.error('Error retrieving merge notes:', error);
    return [];
  }
}

async function getPullRequestBySHAV1(octokit, sha){
  try{
    const response = await octokit.pulls.list({
      owner: owner,
      repo: repo,
      state: 'all',
    });
    const pullRequests = response.data.map(pullRequestCont => {
      const pullRequest = {};
      pullRequest.title = pullRequestCont.title;
      pullRequest.body = pullRequestCont.body;
      pullRequest.sha = pullRequestCont.merge_commit_sha;
      return pullRequest;
    });
    const pullRequest = pullRequests.filter(obj => obj.sha === sha);
    console.log(pullRequest);
    return pullRequest;    
  }catch(error){
    console.error('Error retrieving merge notes:', error);
    return [];
  }
}

const owner = process.env.GITHUB_REPOSITORY.split("/")[0];
const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
const pullNumber = getPRNumber();

fetchCommitNotesV1(owner, repo, pullNumber)
  .then(commitNotes => {
    core.setOutput("commit-notes-md", commitNotes)
  })
  .catch(error => {
    console.error('Error:', error);
});