const express = require('express');
const multer = require('multer'); // Middleware for handling file uploads
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
// const sqs = new AWS.SQS();
const cors = require('cors');
const csv = require('csv-parser');

const app = express();
// const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploaded files
const upload = multer({ storage: multer.memoryStorage() });


// Enable CORS for the API
app.use(cors());


// API endpoint to handle file upload and enqueue email sending task
app.post('/api/send-emails', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file uploaded.');
      return res.status(400).send('No file uploaded.');
    }

    console.log('Uploaded file:', req.file);

    const fileContent = req.file.buffer;
    console.log('File content:', fileContent);

    const s3Params = {
      Bucket: 'demo-lambda-mailer',
      Key: `uploads/${req.file.originalname}`,
      Body: fileContent,
    };
    console.log('S3 upload params:', s3Params);
    // console.log(fileContent);
    // 

    // callback style of writing the same function
    // Upload the file to S3 and handle any errors
    // s3.upload(s3Params, function(err, data) {
    //   if (err) {
    //     console.log("Error uploading file:", err);
    //   } else {
    //     console.log("Successfully uploaded file:", data);
    //   }
    // });

    // Promise style of function for uploading to S3
    // const s3Response = await s3.upload(s3Params).promise();
    // console.log('S3 upload response:', s3Response);
    try {
      const s3Response = await s3.upload(s3Params).promise();
      console.log('S3 upload response:', s3Response);
    } catch (err) {
      console.log("Error uploading file:", err);
    }

    
    const fileStream = s3.getObject({ Bucket: s3Params.Bucket, Key: s3Params.Key }).createReadStream();
    const ses = new AWS.SES();

    fileStream
      .pipe(csv())
      .on('data', (data) => {
        try {
          console.log('CSV data:', data);

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
          console.log('Email params:', emailParams);

          ses.sendEmail(emailParams).promise();
        } catch (error) {
          console.error('Error sending email:', error);
        }
      })
      .on('end', () => {
        console.log('Email sending process completed!');
        res.status(200).send('Emails sent successfully!');
      });
    } catch (error) {
      console.error('Error:', error);
      console.error('Error stack trace:', error.stack);
      res.status(500).send('Error sending emails: ' + error.message);
    }
  });

module.exports = app;




//bing suggested more error handling
//     const s3Response = await s3.upload(s3Params).promise();
//     console.log('S3 upload response:', s3Response);

//     const fileStream = s3.getObject({ Bucket: s3Params.Bucket, Key: s3Params.Key }).createReadStream();
//     const ses = new AWS.SES();

//     fileStream
//       .pipe(csv())
//       .on('data', (data) => {
//         try {
//           console.log('CSV data:', data);

//           const { email, name } = data;
//           const emailParams = {
//             Destination: {
//               ToAddresses: [email],
//             },
//             Message: {
//               Body: {
//                 Text: {
//                   Data: `${req.body.customMessage}\n\nRegards,\nYour App`,
//                 },
//               },
//               Subject: {
//                 Data: 'Your Custom Email Subject',
//               },
//             },
//             Source: 'fringe.xb6783746@gmail.com',
//           };
//           console.log('Email params:', emailParams);

//           ses.sendEmail(emailParams).promise();
//         } catch (error) {
//           console.error('Error sending email:', error);
//         }
//       })
//       .on('end', () => {
//         console.log('Email sending process completed!');
//         res.status(200).send('Emails sent successfully!');
//       });
//   } catch (error) {
//     console.error('Error:', error);
//     console.error('Error stack trace:', error.stack);
//     res.status(500).send('Error sending emails: ' + error.message);
//   }
// });
























//added try catch

//         const { email, name } = data;
//         const emailParams = {
//           Destination: {
//             ToAddresses: [email],
//           },
//           Message: {
//             Body: {
//               Text: {
//                 Data: `${req.body.customMessage}\n\nRegards,\nYour App`,
//               },
//             },
//             Subject: {
//               Data: 'Your Custom Email Subject',
//             },
//           },
//           Source: 'fringe.xb6783746@gmail.com',
//         };

//         ses.sendEmail(emailParams).promise();
//       })
//       .on('end', () => {
//         console.log('Email sending process completed!');
//         res.status(200).send('Emails sent successfully!');
//       });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Error sending emails.');
//   }
// });



//this was before removeing SQS

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

