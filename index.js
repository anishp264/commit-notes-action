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
          const parts = commit.commit.message.split("-pr\n\n");
          container.message = parts[1];
        }        
      }
      return container;
    });

    let markdownContent = `# Merge Notes`;

    let commitMarkDownContent = `# Commit Notes`;
    
    commits.forEach((commit) => {
      if(commit.commitType == commitText){
        commitMarkDownContent += `
        - ${commit.commitDate} | ${commit.commitSha.slice(0,6)} | ${commit.message} [${commit.committerEmail}]`;
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

function getPRNumber(){
  const githubRef = process.env.GITHUB_REF;
  const pullRequestRegex = /refs\/pull\/(\d+)\/merge/;
  const match = githubRef.match(pullRequestRegex);
  const pullNumber = match ? match[1] : null;
  return pullNumber;
}

function isStringInputValid(stringInput){
  return (!stringInput || stringInput.trim() === "") ? false : true;
}

const owner = process.env.GITHUB_REPOSITORY.split("/")[0];
const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
const pullNumber = getPRNumber();

fetchCommitNotes(owner, repo, pullNumber)
  .then(commitNotes => {
    core.setOutput("commit-notes-md", commitNotes)
  })
  .catch(error => {
    console.error('Error:', error);
});