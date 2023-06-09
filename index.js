const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');

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

    const commits = response.data.map(commit => {
      const container = {};
      container.message = commit.commit.message;
      container.committerName = commit.commit.committer.name;
      container.committerEmail = commit.commit.committer.email;
      container.commitDate = commit.commit.committer.date;
      container.commitSha = commit.sha;
      return container;
    });

    let markdownContent = `# Merge Notes
    ## ${prResponse.data.title}
    ${prResponse.data.body}
    ---
    # Commit Notes`;
    
    commits.forEach((commit) => {
      markdownContent += `
      - ${commit.commitDate} | ${commit.commitSha.slice(0,6)} | ${commit.message} [${commit.committerEmail}]`;
    });
    markdownContent += `
    ---`;
    return markdownContent;
  } catch (error) {
    console.setFailed('Error retrieving commit messages:', error);
    return [];
  }
}

//This function fetches the commit notes
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

    const commits = response.data.map(commit => {
      const container = {};
      container.message = commit.commit.message;
      container.committerName = commit.commit.committer.name;
      container.committerEmail = commit.commit.committer.email;
      container.commitDate = commit.commit.committer.date;
      container.commitSha = commit.sha;
      container.commitType = "COMMIT";
      let message = commit.commit.message;
      if(container.committerName == "GitHub")
      {
        container.commitType = "PR";
        const inputString  = message;
        const parts = inputString.split("-pr\n\n");
        container.message = parts[1];
      }
      return container;
    });

    let markdownContent = `# Merge Notes
    ## ${prResponse.data.title}
    ${prResponse.data.body}
    ---
    # Commit Notes`;
    
    commits.forEach((commit) => {
      
      markdownContent += `
      - Commit Date: ${commit.commitDate} 
      - Commit SHA: ${commit.commitSha}
      - Commit Message: ${commit.message}
      - Committer Name: ${commit.committerName}
      - Commit Email: [${commit.committerEmail}]
      - Commit Type: ${commit.commitType}`;
    });
    markdownContent += `
    ${commits.length}
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

function getDate(dateTime){
    let date = dateTime.toJSON();
    return(date.slice(0,10));
}

const owner = process.env.GITHUB_REPOSITORY.split("/")[0];
const repo = process.env.GITHUB_REPOSITORY.split("/")[1];
const pullNumber = getPRNumber();

/*fetchCommitNotes(owner, repo, pullNumber)
  .then(commitNotes => {
    core.setOutput("commit-notes-md", commitNotes)
  })
  .catch(error => {
    console.error('Error:', error);
});*/

fetchCommitNotesV1(owner, repo, pullNumber)
  .then(commitNotes => {
    core.setOutput("commit-notes-md", commitNotes)
  })
  .catch(error => {
    console.error('Error:', error);
});