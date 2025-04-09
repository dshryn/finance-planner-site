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

//home page
app.get('/',function(req,res){
    res.sendFile(__dirname+'/'+'index.html')
})
app.get('/logout',function(req,res){
    if(req.session.uid)
    {
        req.session.destroy(err=>{
            if(err)
                {res.redirect('/?logout=error')
                    console.log(err)
                }
                res.clearCookie('connect.sid')
                res.redirect('/?logout=success')
        });
    }
    else{
        res.redirect('/?logout=invalid')
    }
})
//transactions page
app.get('/transactions',function(req,res){
    if(req.session.uid)
    res.sendFile(__dirname+'/'+'transactions.html')
    else
    res.redirect('/?redirect=invalid')
})

//reports page
app.get('/reports',function(req,res){
    if(req.session.uid)
    res.sendFile(__dirname+'/'+'reports.html')
    else
    res.redirect('/?redirect=invalid')
})
// budget page
app.get('/budget',function(req,res){
    res.sendFile(__dirname+'/'+'budget.html')
})

//set budget page
app.get('/setIncome', function(req,res){
    res.sendFile(__dirname+'/'+'income_setup.html')
})
//login page
app.get('/login',function(req,res){
    res.sendFile(__dirname+'/'+'login.html')
    
})
app.post('/loginSubmit',async function(req,res){
    const email = req.body.loginEmail;  

    
    const password = req.body.loginPassword;
    checkerQuery = "SELECT id,no_login FROM users WHERE email=$1 AND password=$2"
    checkerValues = [email,password]
    let check = await pool.query(checkerQuery,checkerValues)
    if(check.rows.length==0)
        res.json({success:false})
    else
    {
        
        req.session.uid = check.rows[0].id;
        console.log("session-id:-"+req.session.uid)
        const updateQuery = "UPDATE users SET no_login=no_login+1 WHERE id=$1"
        updateValue = [req.session.uid]
        await pool.query(updateQuery,updateValue)
        res.json({success:true,no_login:check.rows[0].no_login})
    }
})
app.post('/signupSubmit',async function(req,res){
    var uname = req.body.signupUsername;
    var password = req.body.signupPassword;
    var email = req.body.signupEmail;
    var checkerQuery = "SELECT * FROM users WHERE email=$1"
    var checkerValue = [email];
    check = await pool.query(checkerQuery,checkerValue)
    if(check.rows.length!=0)
        return res.redirect('/login?signup=exists')
    try{
        query = "INSERT INTO users(name,email,password,no_login) VALUES($1,$2,$3,0)"
        values = [uname,email,password]
        result = await pool.query(query,values)
        res.redirect('/login?signup=success')
        console.log(uname+' '+password+' '+email)
    }
    catch(error)
    {
        res.redirect('/login?signup=fail')
    }
})
app.post('/setupSubmit', async function(req, res) {
    var month = req.body.month;
    var limit = req.body.monthlyIncome;
    var food = req.body.foodLimit;
    var travel = req.body.travelLimit;
    var rent = req.body.rentLimit;
    var shopping = req.body.shoppingLimit;
    var vehicle = req.body.vehicleLimit;
    var other = req.body.otherLimit;
    const uid = req.session.uid;

    const categories = {
        Food: food,
        Travel: travel,
        Rent: rent,
        Shopping: shopping,
        Vehicle: vehicle,
        Other: other
    };

    try {
        for (const [category, catLimit] of Object.entries(categories)) {
            if (catLimit !== undefined && catLimit !== '') {
                // Insert into BUDGET
                await pool.query(
                    'INSERT INTO BUDGET(uid, month, category, monthly_limit, amount_left) VALUES ($1, $2, $3, $4, $5)',
                    [uid, month, category, catLimit, catLimit]
                );

                // Check if a report already exists
                const checkReport = await pool.query(
                    'SELECT * FROM REPORT WHERE uid=$1 AND month=$2 AND category=$3',
                    [uid, month, category]
                );

                if (checkReport.rows.length === 0) {
                    // Get max id for this user to assign the new one
                    const idResult = await pool.query(
                        'SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM REPORT WHERE uid=$1',
                        [uid]
                    );
                    const newId = idResult.rows[0].next_id;

                    // Insert into REPORT
                    await pool.query(
                        'INSERT INTO REPORT(id, uid, month, category, total_income, total_expense) VALUES ($1, $2, $3, $4, $5, $6)',
                        [newId, uid, month, category, catLimit, 0]
                    );
                } else {
                    // Optional: update existing report if needed (e.g., reset it)
                    await pool.query(
                        'UPDATE REPORT SET total_income=$1, total_expense=0 WHERE uid=$2 AND month=$3 AND category=$4',
                        [catLimit, uid, month, category]
                    );
                }
            }
        }

        res.redirect('/?setup=true');
    } catch (err) {
        console.error('Error inserting budget/report data:', err);
        res.redirect('/setIncome?setup=false');
    }
});

app.post('/transSubmit', async function(req, res) {
    const { month, description, category, amount } = req.body;
    const uid = req.session.uid;
    const amt = parseFloat(amount);

    try {
        // Start transaction
        await pool.query('BEGIN');

        // 1. Get the next trans_id for this user
        const transIdResult = await pool.query(
            'SELECT COALESCE(MAX(trans_id), 0) + 1 AS next_id FROM transactions WHERE uid = $1',
            [uid]
        );
        const nextTransId = transIdResult.rows[0].next_id;

        // 2. Insert into transactions
        await pool.query(
            `INSERT INTO transactions(uid, trans_id, amount, category, description, month)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uid, nextTransId, amt, category, description, month]
        );

        // 3. Update budget table
        await pool.query(
            `UPDATE budget 
             SET amount_left = amount_left - $1 
             WHERE uid = $2 AND month = $3 AND category = $4`,
            [amt, uid, month, category]
        );

        // 4. Get the updated monthly_limit and amount_left for the report
        const budgetData = await pool.query(
            `SELECT monthly_limit, amount_left 
             FROM budget 
             WHERE uid = $1 AND month = $2 AND category = $3`,
            [uid, month, category]
        );

        const { monthly_limit, amount_left } = budgetData.rows[0];
        const total_expense = monthly_limit - amount_left;

        // 5. Check if report exists
        const reportCheck = await pool.query(
            `SELECT id FROM report 
             WHERE uid = $1 AND month = $2 AND category = $3`,
            [uid, month, category]
        );

        if (reportCheck.rowCount > 0) {
            // 6. Update existing report
            await pool.query(
                `UPDATE report 
                 SET total_expense = $1 
                 WHERE uid = $2 AND month = $3 AND category = $4`,
                [total_expense, uid, month, category]
            );
        } else {
            // 7. Insert new report with next user-specific ID
            const reportIdResult = await pool.query(
                `SELECT COALESCE(MAX(id), 0) + 1 AS next_id 
                 FROM report WHERE uid = $1`,
                [uid]
            );
            const nextReportId = reportIdResult.rows[0].next_id;

            await pool.query(
                `INSERT INTO report(id, uid, total_income, total_expense, category, month)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [nextReportId, uid, monthly_limit, total_expense, category, month]
            );
        }

        // Commit transaction
        await pool.query('COMMIT');
        res.redirect('/transactions?update=true');
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Transaction error:', err);
        res.redirect('transactions?update=false')
    }
});
app.get('/api/reports', async (req, res) => {
    try {
        const uid = req.session.uid;
        if (!uid) return res.status(401).json({ error: 'Unauthorized' });

        const result = await pool.query(
            'SELECT month, category, total_income, total_expense FROM report WHERE uid = $1',
            [uid]
        );
        const data = {};
        result.rows.forEach(row => {
            const key = `${row.month}_${row.category}`;
            data[key] = {
                total_income: row.total_income,
                total_expense: row.total_expense
            };
        });

        res.json(data);
        console.log('report sent for uid:-'+uid)
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.redirect('/reports?fetch=false');
    }
});
app.get('/setDashboard', async function(req,res) {
    if(req.session.uid)
    {
        var income;
        var expense;
        var balance;
        const query = 'SELECT sum(total_income) AS income,sum(total_expense) AS expense,sum(total_income-total_expense) AS balance FROM report WHERE uid=$1 AND month=$2'
        const val = [req.session.uid,'April']
        const result = await pool.query(query,val)
        income = result.rows[0].income;
        expense = result.rows[0].expense;
        balance = result.rows[0].balance;
        res.json({total_income:income,total_expense:expense,balance:balance});
        }
    else
    res.json({total_income:0,total_expense:0,balance:0});
  });
  


app.listen('8000')