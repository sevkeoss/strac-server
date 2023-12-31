### Strac Google Drive Server

This server is used to interact with the Google Drive API. Users who use this server can list files in their drive, download text files, and list users who have access to a specific file.

Finally, users who subscribe to a specific file will receive notifications when someone is added to or removed from a specific file in the drive.

#### Setup Instructions

1. To be able to run this google drive api server, you need to first create a google cloud project. Please go to this link and follow the instructions: [Create a Google Cloud Project](https://developers.google.com/workspace/guides/create-project)

2. After that, you need to enable the Google Drive API. Go to this link: [Enable Google Workspace APIs](https://developers.google.com/workspace/guides/enable-apis) and enable the one labeled "Drive API".

3. You need to setup your access credentials. Follow the link: [Set up your environment](https://developers.google.com/drive/api/quickstart/nodejs), under the "Set up your environment" section.

4. After you are done with the "Authorize credentials for a desktop applcation" section, download the "credentials.json" file. You will need this for later.

5. Then, go to [Sign in with app passwords](https://support.google.com/accounts/answer/185833?hl=en) to create an app password for your gmail. This is needed for sending updates through the server.

6. After that, go to [ngrok setup](https://ngrok.com/docs/getting-started/). Follow the steps to install ngrok and add your authorization token.

7. Once that's done, run `ngrok http 3000`. After running the command, a popup should display. Take the url next to "forwarding". Example: "https://a40c-2600-6c50-b00-292e-d6f1-70a2-ca2b-63b4.ngrok-free.app".

8. You need to install nodejs on the system. You can follow this link: [Install NodeJS](https://nodejs.org/en)

9. Download the project from github. `git clone git@github.com:sevkeoss/strac-server.git`.

10. Go inside the strac-server folder and copy the "credentials.json" file inside.

11. Create an "email.json" file and set "email" of your choice and "appPassword" from before. This is used to send emails to customers.

12. Then, create a "ngrok.json" file and set the "ngrok" value to the be the forwarding url you got after running the `ngrok http 3000` command. At the end of the url, add "/changes".

13. Run `npm install` in the terminal to install all the necessary packages.

14. Run `node app/server.js` in the terminal. For the first time (i.e. you don't see a "token.json" file), it should bring a pop up that you need to go through to give google drive api access to the google drive. After you run this, a "token.json" file should be created and the server should start.

#### APIs

- ListFiles - /list-files

  - Arguments: None
  - Response: List containing various file names and their id

  Example: http://localhost:3000/list-files

- DownloadFile - /download/\<fileId\>

  - Argument: Id of file to download
  - Response: File

  Example: http://localhost:3000/download/1234

- ListPermission - /permissions/\<fileId\>

  - Argument: Id of file to get permissions of
  - Response: Permissions of all users on the file

  Example: http://localhost:3000/permissions/1234

- Subscribe - /subsribe/\<fileId\>

  - Argument: Id of file to subscribe to.
  - Request body: Email to send notifications to
  - Response: Success/Failure

    Example:
    http://localhost:3000/subscribe/1234
    {
    "email": "sample@test.com"
    }

#### Design Decisions

- For interacting with most of the APIs, you need the file id. The id for a file can be obtained after calling the list-files API.

- ListFiles will return all the files in the google drive. If there's a lot of files, it will take a bit of time.

- For downloading files, currently on text files are supported. It's not possible to download a .mp4 file for example. In addition, the files are exported and downloaded as .pdf files.

- To test downloading files, you need to use the browser.

- For real time notifications, I used a PubSub model. I poll every 5 seconds to see if there were changes to the file. If there were, I compare the permissions before and after to determine which users were added to or removed from the file. Then, whoever subscribed to receive updates for a particular file will receive the updates.

- As an improvement, if I had a public server, Google Drive API has a watch() api for changes and files. Its a similar PubSub model, but our server wouldn't need to do constant polling. Only when file access changes are detected, the web hook link passed to the watch() api will get a notification. From there, we can do more custom notifications for users.
