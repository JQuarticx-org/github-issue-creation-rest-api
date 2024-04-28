const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const morgan = require("morgan");
const Joi = require('joi');
const app = express();
const PORT = process.env.PORT || 3000;

// Set up Morgan middleware for logging in JSON format
app.use(
  morgan((tokens, req, res) => {
    // Get current UTC time
    const utcDate = new Date(tokens["date"](req, res, "iso"));

    // Adjust the time to IST (UTC + 5 hours 30 minutes)
    const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);

    return JSON.stringify({
      dateTime: istDate.toISOString().replace("T", " ").replace(/\..+/, ""),
      remoteAddr: tokens["remote-addr"](req, res),
      remoteUser: tokens["remote-user"](req, res),
      method: tokens["method"](req, res),
      url: tokens["url"](req, res),
      httpVersion: tokens["http-version"](req, res),
      status: tokens["status"](req, res),
      contentLength: tokens["res"](req, res, "content-length"),
      referrer: tokens["referrer"](req, res),
      userAgent: tokens["user-agent"](req, res),
    });
  })
);

// Middleware for parsing JSON bodies
app.use(bodyParser.json());

// Route for handling GET requests
app.get("/", (req, res) => {
  res.json({
    status: "running",
    statusCode: 200,
  });
});

// Route for handling POST requests
app.post("/postMessage", validatePostMessageBody, async (req, res) => {
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;
  const labels = ["question", "help wanted"];

  try {
    const collaborators = await getCollaboratorsPromise(repoOwner, repoName);
    if (collaborators.length > 0) {
      const numAssignees = 1;
      const assignees = getRandomAssignees(collaborators, numAssignees);
      // console.log("Assigning issue to:", assignees.join(", "));

      const issueTitle = req.body.requestBody.attachments[0].title;
      const issueBody = createIssueBody(req.body.requestBody.attachments[0]);

      await createGithubIssuePromise(
        repoOwner,
        repoName,
        issueTitle,
        issueBody,
        labels,
        assignees
      );
      res
        .status(200)
        .json({ StatusCode: 200, assignees, message: "RequestCreated" });
    } else {
      console.log(
        "No collaborators available. Issue will be created without assignees."
      );
      const issueTitle = req.body.requestBody.attachments[0].title;
      const issueBody = createIssueBody(req.body.requestBody.attachments[0]);

      await createGithubIssuePromise(
        repoOwner,
        repoName,
        issueTitle,
        issueBody,
        labels,
        []
      );
      res
        .status(200)
        .json({ StatusCode: 200, assignees, message: "RequestCreated" });
    }
  } catch (error) {
    // console.error("Error:", error);
    res.status(500).json({ StatusCode: 500, message: "InternalServerError" });
  }
});

// Function to get GitHub collaborators with Promise
function getCollaboratorsPromise(repoOwner, repoName) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/collaborators`;
    const options = {
      url: url,
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "Node.js",
      },
    };
    request.get(options, (error, response, body) => {
      if (error) {
        reject(error);
        return;
      }
      if (response.statusCode !== 200) {
        reject(
          new Error(
            `Failed to get collaborators. Status code: ${response.statusCode}`
          )
        );
        return;
      }
      const collaborators = JSON.parse(body);
      const logins = collaborators.map((collaborator) => collaborator.login);
      resolve(logins);
    });
  });
}

// Function to create a GitHub issue with Promise
function createGithubIssuePromise(
  repoOwner,
  repoName,
  title,
  body,
  labels,
  assignees
) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues`;
    const options = {
      url: url,
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "Node.js",
      },
      body: JSON.stringify({
        title: title,
        body: body,
        labels: labels,
        assignees: assignees,
      }),
    };
    request.post(options, (error, response, body) => {
      if (error) {
        reject(error);
        return;
      }
      if (response.statusCode !== 201) {
        reject(
          new Error(
            `Failed to create issue. Status code: ${response.statusCode}`
          )
        );
        return;
      }
      resolve();
    });
  });
}

// Function to create issue body from attachment
function createIssueBody(attachment) {
  const fields = attachment.fields
    .map((field) => {
      return `| ${field.title} | ${field.value} |`;
    })
    .join("\n");

  return `

${attachment.text}. Refer to the table below for more information.

| FIELDS | VALUES |
| ----- | ----- |
${fields}
`;
}

// Function to get random assignees
function getRandomAssignees(collaborators, numAssignees) {
  const shuffled = collaborators.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numAssignees);
}

// Define the schema for the request body
const postMessageSchema = Joi.object({
  requestBody: Joi.object({
    attachments: Joi.array()
      .items(
        Joi.object({
          color: Joi.string().required(),
          pretext: Joi.string().required(),
          title: Joi.string().required(),
          text: Joi.string().required(),
          fields: Joi.array()
            .items(
              Joi.object({
                title: Joi.string().required(),
                value: Joi.string().required(),
              })
            )
            .required(),
        })
      )
      .required(),
  }).required(),
});

function validatePostMessageBody(req, res, next) {
  const { error } = postMessageSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ StatusCode: 400, message: "BadRequest", error: error.details });
  }
  next();
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
