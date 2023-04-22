const express = require('express');
const bodyParser = require('body-parser');
const Membre = require('./models/membre');
const Parents = require('./models/parents');
const User=require('./models/user')
let session=require('express-session')
let nodemailer = require('nodemailer');
let { check } = require('express-validator');
const crypto = require('crypto')
const hashingSecret = "foodyel";
let cookieSession = require('cookie-session')
const multer = require('multer');
const { data } = require('jquery');
const app = express();
let server = require('http').Server(app)
const {Server}=require('socket.io')
let io = new Server(server)

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/assets',express.static('public'))
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())

app.use(session({
    secret:'john',
    resave:false,
    saveUninitialized:true,
    cookie: {secure:false}
}))
app.use(require('./middlewares/flash'))
var id_chef =1
var user=null
var user2
var sess
var code
var css=null
var email=null
var password=null
// Page d'accueil
app.get('/', (req, res) => {
  Membre.ajouterConjointsPourEnfants()
  Membre.supprimerCouplesSansEnfants()
  // Charger les membres depuis la base de données
  Membre.findMembres((membres)=>{
    var membres2=membres
    var membres3=[]
    const obj = Object.values(membres2);
    const keys=Object.keys(obj[0])
    var conjoint=[]
    var enfants=[]
    for (const key of keys) {
      membres3[obj[0][key].id]=obj[0][key]
      Membre.findConjoint(obj[0][key].id,(conjoints)=>{
        conjoint[obj[0][key].id]=conjoints
        for (const cjoint of conjoints){
          Membre.findEnfant(obj[0][key].id, cjoint,(data)=>{
            if(data.length!==0){
              enfants[Membre.parenter(obj[0][key].id,cjoint)]=data
              Membre.lastconjoint((id)=>{
                if(cjoint===id){
                  res.render('pages/index', { membr: membres, membres2:membres3, conjoints: conjoint, enfants:enfants, id_chef:id_chef,user:user });
                }
              })
              
            }
          })
          
          
        }
      })
    }

  })

});
app.get('/index', (req, res) => {

  // Charger les membres depuis la base de données
  Membre.findMembres((membres)=>{
    var membres2=membres
    var membres3=[]
    const obj = Object.values(membres2);
    const keys=Object.keys(obj[0])
    var conjoint=[]
    var enfants=[]
    for (const key of keys) {
      
      membres3[obj[0][key].id]=obj[0][key]
      Membre.findConjoint(obj[0][key].id,(conjoints)=>{
        conjoint[obj[0][key].id]=conjoints
        for (const cjoint of conjoints){
          Membre.findEnfant(obj[0][key].id, cjoint,(data)=>{
            if(data.length!==0){
              enfants[Membre.parenter(obj[0][key].id,cjoint)]=data
              Membre.lastconjoint((id)=>{
                if(cjoint===id){
                  res.render('pages/chef', { membr: membres, membres2:membres3, conjoints: conjoint, enfants:enfants, id_chef:id_chef ,user:user});
                }
              })
              
            }
          })
          
          
        }
      })
    }

  })

});
app.get('/chef', (req, res) => {
  id_chef= 1;
  res.redirect("/")
})


// Définir le dossier de destination pour les fichiers téléchargés
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

// Créer l'objet multer avec la configuration du stockage
const upload = multer({ storage: storage });

// Endpoint pour créer un nouveau membre avec le téléchargement de la photo
app.post('/membres', upload.single('photo'), (req, res) => {
  const prenoms = req.body.prenoms || null;
  const nom = req.body.nom || null;
  const date_naissance = req.body.date_naissance || null;
  const date_deces = req.body.date_deces || null;
  const photo = req.file ? '/images/' + req.file.filename : null; // Récupérer le chemin de la photo téléchargée
  const genre = req.body.genre || null;
  const id_pere = req.body.id_pere || null;
  const id_mere = req.body.id_mere || null;

  // Créer un nouveau membre dans la base de données

  Membre.createMembre(prenoms, nom, date_naissance, date_deces, photo, genre)
    .then(nouveauMembre => {
        Parents.ajouterParent(nouveauMembre.id,id_pere,id_mere)
        console.log('Nouveau membre créé:', nouveauMembre);
        res.redirect('/');
    })
    .catch(error => {
      console.error('Erreur lors de la création d\'un membre')
    })
  })

app.post('/chef', (req, res) => {
    id_chef=req.body.chef || 1;
    res.redirect("/")
})

// Endpoint pour modifier un membre 
app.post('/update', upload.single('photo'), (req, res) => {
  const id = req.body.id || null;
  const prenoms = req.body.prenoms || null;
  const nom = req.body.nom || null;
  const date_naissance = req.body.date_naissance || null;
  const date_deces = req.body.date_deces || null;
  let photo = req.file ? '/images/' + req.file.filename : null; // Récupérer le chemin de la photo téléchargée
  const photo2= req.body.photo2 || null;
  const genre = req.body.genre || null;
  const id_pere = req.body.id_pere || null;
  const id_mere = req.body.id_mere || null;
  if(!photo){
    photo=photo2
  }

  // Modifier un  membre dans la base de données

  Membre.updateMembre(id, prenoms, nom, date_naissance, date_deces, photo, genre)
  .then(results => {
    Parents.modifierParent(id,id_pere,id_mere)
    console.log('Membre mis à jour avec succès');
    res.redirect('/');
  })
  .catch(error => {
    console.error('Erreur lors de la mise à jour des informations du membre:', error);
    
  });
})
app.get('/connexion',(req,res)=>{
  res.render('pages/connexion',{user:user,email:email})
})
app.get('/inscription',(req,res)=>{
  res.render('pages/inscription',{user:user})
})
app.get('/validation',(req,res)=>{
  res.render('pages/validation',{user:user})
})
app.get('/forget',(req,res)=>{
  res.render('pages/forget',{user:user})
})
app.get('/deconnexion',(req,res)=>{
  user=null
  email=null
  res.redirect('connexion')
})


function sendEmailTo2(req,email){
  let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, 
      secureConnection: false,
      auth: {
          user: "famillekoffi00@gmail.com",
          pass: "gnwawtotdskdnaho"
      },
      tls: {
          rejectUnauthorized: false
      }
  });
    let token=Math.round(Math.random() * (999999 - 100000) + 100000);
    sess=req.session;
    code=token
    console.log(token)
    let mailOptions = {
      from: 'famillekoffi00@gmail.com',
      to: email,
      subject: 'Code de validation',
      html: '<a class="item" href="#">'+
      '<i class="users icon" style="color:white"> </i><b style="color:white"> Famille KOFFI</b>'+
      '</a><h2>Content de vous revoir</h2><p>Saisissez le code suivant pour réinitialiser votre mot de pass</p>'+
      '<h2>'+token+'</h2></center>',
      
      };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email envoyé à ' + email);
      }
    });
}
function sendEmailTo(req,email){
  let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, 
      secureConnection: false,
      auth: {
          user: "famillekoffi00@gmail.com",
          pass: "gnwawtotdskdnaho"
      },
      tls:{
          rejectUnAuthorized:true
      }
  });
    let token=Math.round(Math.random() * (999999 - 100000) + 100000);
    sess=req.session;
    code=token
    console.log(token)
    let mailOptions = {
      from: 'famillekoffi00@gmail.com',
      to: email,
      subject: 'Code de validation',
      html: '<a class="item" href="#">'+
      '<i class="users icon" style="color:white"> </i><b style="color:white"> Famille KOFFI</b></a>'+
     '<h2>Bienvenue chez la famille Koffi</h2><p>Saisissez le code suivant pour valider votre inscription</p>'+
      '<h2>'+token+'</h2></center>',
      
      };
    
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email envoyé à ' + email);
      }
    });
}

app.post('/inscription',(request,response)=>{
  email=request.body.email
  user2=request.body
  sendEmailTo(request,email)
  response.redirect('/validation')       
})
app.post('/validation',(request,response)=>{
  var code2=parseInt(request.body.code)
  if(code===code2){
    user=user2
    response.redirect("/")
  }
  else{
    css=''
    response.render('pages/validation',{user,css})
  }       
})
app.post('/connexion',(request,response)=>{
  email=request.body.email
  password=request.body.password
  passwordhash = crypto.createHmac('sha256', hashingSecret).update(password).digest('hex') 
  User.exist_user(email,passwordhash, function(utilisateur){
      if(JSON.stringify(utilisateur) === '{}') {
          css=''
          response.render('pages/connexion',{user,email,password,css})
          
      }
      else{
          user=utilisateur
          response.redirect('/')    
      }
  })
})

app.post('/forget',(request,response)=>{
  email=request.body.email
  sendEmailTo2(request,email)
  response.render('pages/reset',{user,email})
})

app.post('/reset',(request,response)=>{
  email=request.body.email
  password=request.body.password[0]
  var code2=parseInt(request.body.code2)
  password = crypto.createHmac('sha256', hashingSecret).update(password).digest('hex')
  if(code===code2){
    User.update(email,password, function(user){
      response.redirect("connexion")
  })
  }
  else{
    css=''
    response.render('pages/reset',{user,email,css})
  }
})

function emailIsValid (email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Événement pour supprimer un membre
io.on('connection', socket => {
  socket.on('recherche',function(field){
        
    field="'%"+field+"%'"
    Membre.find(field,function(result){
        socket.emit("recherche",result)
    })
  })
  socket.on('deleteMembre', membreId => {
    // Rechercher le membre dans la base de données par son ID
    Membre.deleteMembre(membreId)
    .then(() => {
      console.log('Membre supprimé avec succès');
      console.log(membreId)
      Parents.deleteParent(membreId)
      // Émettre un événement pour informer les clients que le membre a été supprimé
      io.emit('membreSupprime', membreId);
      
    })
    .catch(error => {
      console.error('Erreur lors de la suppression du membre:', error);
    })
  });
  socket.on('getMembre', membreId => {
    
    // Rechercher le membre dans la base de données par son ID
    Membre.findMembreById(membreId)
    .then((membre) => {
      Membre.findParents(membre.id)
      .then((parents) => {
       
        membre.id_pere=parents.id_pere
        membre.id_mere=parents.id_mere
        console.log('Membre trouvé');
        // Émettre un événement pour informer les clients que le membre a été supprimé
        io.emit('getMembre', membre);
      })
      
      
    })
    .catch(error => {
      console.error('Erreur lors de la rechercher du membre:', error);
    })
  });
  socket.on("session2",function(data){
    if(code===data.code){
        socket.emit("goodcode")
    }
    else{
        socket.emit("badcode")
    }  
  })
  socket.on("session",function(data){
    console.log(code)
    if(code===data.code){
        user2.password = crypto.createHmac('sha256', hashingSecret).update(user2.password).digest('hex')
        User.inscription(Object.values(user2),function(){
            user=user2
            socket.emit("connecte",{user})
        })
    }
    else{
        socket.emit("codinvalid")
    }
    
  })
  socket.on('testemail', function(data){
    tel=data.phone
    debut=tel.slice(0,2)
    mail=data.email
        User.exist_email(mail, function(user){
        if(tel.length!=10 || !["01","05","07"].includes(debut)){
            if(tel!=""){
                socket.emit("badphone")
            }
            else{
                if(user.email===mail){
                    socket.emit("invalidemail") 
                }
                else{
                        socket.emit("validemail")
                }
            }    
        }
        else{
            User.exist_phone(tel, function(users){
                if(user.email===mail && users.phone===tel){
                        socket.emit("existemailphone")
                }
                else if(user.email===mail){
                    socket.emit("invalidemail")
                    if(tel!=""){
                        socket.emit("validphone")
                    }
                    
                }
                else if(users.phone===tel){
                        socket.emit("invalidphone")
                        socket.emit("validemail")
                }
                else{
                    
                    socket.emit("valid")
                }
            })
        }
        
    })

  })
  socket.on('testphone', function(data){
    mail=data.email
    tel=data.phone
        User.exist_phone(tel, function(user){
        if(!emailIsValid(mail)){
            if(mail!=""){
                socket.emit("bademail")
            }
            else{
                if(user.phone===tel){
                    socket.emit("invalidphone")
                }
                else{
                    socket.emit("validphone")
                }
            }
        }
        else{
            User.exist_email(mail, function(users){
                if(users.email===mail && user.phone===tel){
                    
                    socket.emit("existemailphone")
                }
                else if(users.email===mail){
                    socket.emit("invalidemail")
                    socket.emit("validphone")
                }
                else if(user.phone===tel){
                    socket.emit("invalidphone")
                    socket.emit("validemail")
                }
                else{
                    socket.emit("valid")
                }
            })
        }  
    })
  })
});

// Démarrer le serveur HTTP
server.listen(3600)