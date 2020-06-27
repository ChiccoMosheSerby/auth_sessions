const mongoose = require('mongoose');//npm i mongoose

const Schema = mongoose.Schema;
const userSchema = new Schema({
    id: String,
    name: String,
    email: String,
    password: String
});


module.exports =
{
    userSchema: mongoose.model('user', userSchema),
}