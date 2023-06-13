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
    const prNumbers = [];
    //const mergeNote = {};

    let markdownContent = `# Merge Notes`;
    if(isStringInputValid(prResponse.data.title)){
      markdownContent += `
      ## ${prResponse.data.title}`;
    }
    if(isStringInputValid(prResponse.data.body)){
      markdownContent += `
      ${prResponse.data.body}`;
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
        if(isStringInputValid(commit.message)){
          const prNumber = getPRNumberFromCommitNote(commit.message);          
          /*const pullRequest = getMergeNote(octokit, prNumber);
          console.log(pullRequest);*/
          getMergeNote(octokit, prNumber)
          .then(pullRequest => {
            console.log(pullRequest);
            if(isStringInputValid(pullRequest.title)){
              markdownContent += `
              ## ${pullRequest.title}`;
            }
            if(isStringInputValid(pullRequest.body)){
              markdownContent += `
              ${pullRequest.body}`;
            }
          })
          .catch(error => {
            console.error('Error:', error);
          });
          /*if(isStringInputValid(pullRequest.title)){
            markdownContent += `
            ## ${pullRequest.title}`;
          }
          if(isStringInputValid(pullRequest.body)){
            markdownContent += `
            ${pullRequest.body}`;
          }*/
        }
      }
    });  

    markdownContent += `
    ---
    ${commitMarkDownContent}
    ---`;

    return markdownContent;
  } catch (error) {
    //console.setFailed('Error retrieving commit messages:', error);
    console.error('Error:', error);
    return [];
  }
}

async function fetchCommitNotesV2(owner, repo){
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN 
  });

  try {
    const prListResponse = await octokit.pulls.list({
      owner: owner,
      repo: repo,
    });

    // Extract the pull request data from the response
    const pullRequests = prListResponse.data.map((pr) => {
      const pullRequest = {};
      pullRequest.number = pr.number;
      pullRequest.title = pr.title;
      pullRequest.body = pr.body;
      return pullRequest;
    });

    console.log(pullRequests);

    const mergeNotes = [];
    const prNumbers = [];
    //const mergeNote = {};

    markdownContent += `
    ---
    ${commitMarkDownContent}
    ---`;

    return markdownContent;
  } catch (error) {
    //console.setFailed('Error retrieving commit messages:', error);
    console.error('Error:', error);
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

function getPRNumberFromCommitNote(commitNote){
  const regex = /#(\w+)/;
  const match = commitNote.match(regex);
  const prNumber = match ? match[1] : null;
  return prNumber;
}

function isStringInputValid(stringInput){
  return (!stringInput || stringInput.trim() === "") ? false : true;
}

async function getMergeNote(octokit, prNumber){
  try{
    const response = await octokit.pulls.get({
      owner: owner,
      repo: repo,
      pull_number: prNumber,
    });
    const mergeNote = {};
    console.log(response);
    mergeNote.title = response.data.title;
    mergeNote.body = response.data.body;
    return mergeNote;
  }catch(error){
    console.setFailed('Error retrieving merge notes:', error);
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

/*fetchCommitNotesV2(owner, repo)
  .then(commitNotes => {
    core.setOutput("commit-notes-md", commitNotes)
  })
  .catch(error => {
    console.error('Error:', error);
});*/