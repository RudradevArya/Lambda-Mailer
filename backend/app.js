const express = require('express');
const multer = require('multer'); // Middleware for handling file uploads
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
// const sqs = new AWS.SQS();
const cors = require('cors');
const csv = require('csv-parser');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploaded files


// Enable CORS for the API
app.use(cors());


// API endpoint to handle file upload and enqueue email sending task
app.post('/api/send-emails', upload.single('file'), async (req, res) => {
  try {
    // Upload the file to S3
    const fileContent = req.file.buffer;
    const s3Params = {
      Bucket: 'demo-lambda-mailer',
      Key: `uploads/${req.file.originalname}`,
      Body: fileContent,
    };
    const s3Response = await s3.upload(s3Params).promise();

    const fileStream = s3.getObject({ Bucket: s3Params.Bucket, Key: s3Params.Key }).createReadStream();
    const ses = new AWS.SES();

    fileStream
      .pipe(csv())
      .on('data', (data) => {
        const { email, name } = data;
        const emailParams = {
          Destination: {
            ToAddresses: [email],
          },
          Message: {
            Body: {
              Text: {
                Data: `${req.body.customMessage}\n\nRegards,\nYour App`,
              },
            },
            Subject: {
              Data: 'Your Custom Email Subject',
            },
          },
          Source: 'fringe.xb6783746@gmail.com',
        };

        ses.sendEmail(emailParams).promise();
      })
      .on('end', () => {
        console.log('Email sending process completed!');
        res.status(200).send('Emails sent successfully!');
      });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error sending emails.');
  }
});

module.exports = app;
//     // Enqueue the email sending task in SQS
//     const sqsParams = {
//       MessageBody: JSON.stringify({
//         filePath: s3Response.Location,
//         customMessage: req.body.customMessage,
//       }),
//       QueueUrl: 'YOUR_SQS_QUEUE_URL',
//     };
//     await sqs.sendMessage(sqsParams).promise();

//     res.status(200).send('Email sending task enqueued successfully!');
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Error enqueuing email sending task.');
//   }
// });

// app.listen(3000, () => {
//   console.log('Server is running on port 3000');
// });

