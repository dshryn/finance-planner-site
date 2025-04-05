require('dotenv').config();
const express = require('express')
const session = require('express-session')
const bparser = require("body-parser")
//const secret = require('')
const {Pool} = require("pg")
const pool = new Pool({user:process.env.DATABASE_USER,host:process.env.DATABASE_SERVER,database:process.env.DATABASE_DB,password:process.env.DATABASE_PASSWORD,port:5432,ssl:{rejectUnauthorized:false}})
pool.connect().then(()=>console.log("Connected")).catch(err=>console.log(err))
app = express()
app.use(bparser.urlencoded({extended:true}))
app.use(session({secret:process.env.SERVER_SECRET_KEY,resave:false,saveUninitialized:false,cookie:{maxAge:1000*60*30,secure:false,httpOnly:true}}))
app.use(express.json())
app.get('/',function(req,res){
    res.sendFile(__dirname+'/'+'index.html')
})
app.get('/login',function(req,res){
    res.sendFile(__dirname+'/'+'login.html')
    
})
app.post('/loginSubmit',async function(req,res){
    const email = req.body.loginEmail;
    const password = req.body.loginPassword;
    checkerQuery = "SELECT id FROM users WHERE email=$1 AND password=$2"
    checkerValues = [email,password]
    let check = await pool.query(checkerQuery,checkerValues)
    if(check.rows.length==0)
        res.json({success:false})
    else
    {
        res.json({success:true})
        req.session.uid = check.rows[0].id;
        console.log(check.rows[0].id)
    }
})
app.post('/signupSubmit',async function(req,res){
    var uname = req.body.signupUsername;
    var password = req.body.signupPassword;
    var email = req.body.signupEmail;
    try{
        query = "INSERT INTO users(name,email,password) VALUES($1,$2,$3)"
        values = [uname,email,password]
        result = await pool.query(query,values)
        res.redirect('/login')
        console.log(uname+' '+password+' '+email)
    }
    catch(error)
    {
        res.send('There was some error in sign up, please reload the page and try again')
    }
})
app.listen('8000')