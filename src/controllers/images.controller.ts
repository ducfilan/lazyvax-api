import AWS from 'aws-sdk'
import { DoSpaceName, DoEndpoint, DoPreSignExpirationInSecond, SupportingContentTypes, HttpStatusBadRequest } from '@common/consts'

const spacesEndpoint = new AWS.Endpoint(DoEndpoint)
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET
});


export default class ImagesController {
  static async apiGetPreSignedUrl(req, res, next) {
    if (!validateRequest(req)) {
      res.status(HttpStatusBadRequest)
    }

    try {
      const url = s3.getSignedUrl('putObject', {
        Bucket: DoSpaceName,
        Key: req.body.fileName,
        ContentType: req.body.contentType,
        ACL: 'public-read',
        Expires: DoPreSignExpirationInSecond
      });

      return res.json({ url })
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}

function validateRequest(req) {
  const { fileName, contentType } = req.body

  if (!fileName || !contentType) {
    return false
  }

  return !!(SupportingContentTypes.includes(contentType))
}
