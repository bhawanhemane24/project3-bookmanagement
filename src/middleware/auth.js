const jwt = require('jsonwebtoken')

const auth = function(req, res, next){
    try {
        let token = req.headers["x-api-key"]
        if(!token)  return res.status(401).send({status : false, message : "Please provide a token"})

        jwt.verify(token, "CACA", (err, decodedToken) => {
            if(err && err.message == "jwt expired")    return res.status(401).send({ status: false, message: "Session expired! Please login again." })
            if(err) return res.status(401).send({status : false, message : "Incorrect token"})

            req.token = decodedToken
            req.userId = decodedToken.userId;
            next()
        })
    } catch (error) {
        return res.status(500).send({status : false, message : error.message})
    }
}

module.exports = {auth}