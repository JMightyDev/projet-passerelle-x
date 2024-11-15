import { Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useContext, useRef, useState } from "react";
import { AuthContext } from "../store/authContext";
import LogoX from "../components/LogoX/LogoX";
import { getAuth, updateProfile } from "firebase/auth";
import Loading from "../components/Loading/Loading";
import { motion, AnimatePresence } from "framer-motion"; // Ajouter l'import

// Page de création de compte de X.com
export default function Login() {
  // Variables
  const { createUser, loginUser, user } = useContext(AuthContext);

  // States
  const [loading, setLoading] = useState(false);
  const [loginPopup, setLoginPopup] = useState(false);

  // Refs
  const emailLoginRef = useRef(null);
  const passwordLoginRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin },
  } = useForm();

  if (loading) {
    return <Loading />;
  }

  const onRegisterSubmit = async (data) => {
    if (loading) return <Loading />;
    setLoading(true);

    try {
      await createUser(data.email, data.password);
      await updateProfile(getAuth().currentUser, {
        displayName: data.displayName,
      });
      toast.success(`Bienvenue ${data.displayName}!`);
    } catch (error) {
      const { code, message } = error;
      if (code === "auth/email-already-in-use") {
        toast.error("Cette adresse e-mail est déjà utilisée.");
      } else {
        toast.error(message);
      }
    }
    setLoading(false);
    return <Navigate to="/home" />;
  };

  const onLoginSubmit = async (data) => {
    if (loading) return;
    setLoading(true);

    loginUser(data.emailLogin, data.passwordLogin)
      .then(() => {
        setLoading(false);
        toast.success(`Enfin de retour ${getAuth().currentUser.displayName}!`);
      })
      .catch((error) => {
        setLoading(false);
        const { code, message } = error;
        if (code === "auth/user-not-found") {
          toast.error("Aucun utilisateur trouvé avec cette adresse e-mail.");
          return;
        } else if (code === "auth/wrong-password") {
          toast.error("Le mot de passe est incorrect.");
          return;
        } else if (code === "auth/invalid-credential") {
          toast.error("Les informations d'identification fournies sont incorrectes.");
          return;
        } else if (code === "auth/too-many-requests") {
          toast.error("Trop de tentatives. Réessayez plus tard.");
          return;
        } else if (code === "auth/user-disabled") {
          toast.error("Cet utilisateur a été désactivé.");
          return;
        } else if (code === "auth/invalid-email") {
          toast.error("Adresse e-mail invalide.");
          return;
        } else if (code === "auth/weak-password") {
          toast.error("Le mot de passe doit contenir au moins 6 caractères.");
          return;
        } else {
          toast.error(message);
        }
      });
  };

  if (user) {
    return <Navigate to="/home" />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center pt-20 flex-wrap justify-evenly h-screen">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
          <LogoX className="w-24 lg:w-96 max-sm:mb-5" />
        </motion.div>
        <div className="flex items-center">
          <div className="flex flex-col items-center space-y-3 w-[450px]">
            <motion.span
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-[64px] font-chirpbold leading-tight text-center">
              Ça se passe maintenant
            </motion.span>
            <motion.h2
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="pt-6 pb-3 text-[31px] font-chirpbold tracking-widest">
              Inscrivez-vous.
            </motion.h2>
            <form
              onSubmit={handleSubmit(onRegisterSubmit)}
              className="flex flex-col space-y-4 w-80 text-black">
              <motion.input
                whileFocus={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                type="text"
                placeholder="Pseudo"
                autoFocus
                className={`p-3 border border-gray-300 rounded h-10 ${
                  errors.displayName ? "outline-red-400" : ""
                }`}
                {...register("displayName", {
                  required: "Le pseudo est requis",
                  minLength: {
                    value: 3,
                    message: "Le pseudo doit contenir au moins 3 caractères.",
                  },
                  maxLength: {
                    value: 50,
                    message: "Le pseudo doit contenir au maximum 50 caractères.",
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: "Le pseudo ne doit contenir que des lettres, chiffres et underscores",
                  },
                })}
              />
              {errors.displayName && (
                <span className="text-red-500 text-xs">{errors.displayName.message}</span>
              )}
              <motion.input
                whileFocus={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                type="email"
                placeholder="Adresse email"
                className={`p-3 border border-gray-300 rounded h-10 ${
                  errors.email ? "outline-red-400" : ""
                }`}
                {...register("email", {
                  required: true,
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
                    message: "Veuillez entrer une adresse e-mail valide.",
                  },
                })}
              />
              <motion.input
                whileFocus={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                type="password"
                placeholder="Mot de passe"
                className={`p-3 border border-gray-300 rounded h-10 ${
                  errors.password ? "outline-red-400" : ""
                }`}
                {...register("password", {
                  required: true,
                  minLength: {
                    value: 8,
                    message: "Le mot de passe doit contenir au moins 8 caractères.",
                  },
                  maxLength: {
                    value: 50,
                    message: "Le mot de passe doit contenir au maximum 50 caractères.",
                  },
                })}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full font-bold">
                Créer un compte
              </motion.button>
              <div className="text-xs w-80 text-[#8B98A5]">
                En vous inscrivant, vous acceptez les{" "}
                <Link to="#" className="text-[#1D9BF0]">
                  Conditions d&apos;utilisation
                </Link>{" "}
                et la{" "}
                <Link to="#" className="text-[#1D9BF0]">
                  Politique de confidentialité
                </Link>
                , notamment l&apos;
                <Link to="#" className="text-[#1D9BF0]">
                  Utilisation des cookies
                </Link>
                .
              </div>
            </form>
            <div>
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-16 mb-4 font-chirpbold tracking-wider text-center">
                Vous avez déjà un compte ?
              </motion.h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLoginPopup(true)}
                className="p-2 bg-[#15202B] hover:bg-[#162D3F] text-[#1D9BF0] rounded-full font-bold block text-center border border-white border-opacity-30 w-80">
                Se connecter
              </motion.button>
            </div>
          </div>
        </div>
        {/* Footer avec animation */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap space-x-5 justify-around items-center w-screen h-16 mt-20 text-[#8B98A5] text-xs px-12">
          <Link className="hover:underline">À propos</Link>
          <Link className="hover:underline">Téléchargez l&apos;application X</Link>
          <Link className="hover:underline">Centre d&apos;assistance</Link>
          <Link className="hover:underline">Conditions d&apos;utilisation</Link>
          <Link className="hover:underline">Politique de Confidentialité</Link>
          <Link className="hover:underline">Politique relative aux cookies</Link>
          <Link className="hover:underline">Accessibilité</Link>
          <Link className="hover:underline">Informations sur les publicités</Link>
          <Link className="hover:underline">Blog</Link>
          <Link className="hover:underline">Carrières</Link>
          <Link className="hover:underline">Ressources de la marque</Link>
          <Link className="hover:underline">Publicité</Link>
          <Link className="hover:underline">Marketing</Link>
          <Link className="hover:underline">X pour les professionnels</Link>
          <Link className="hover:underline">Développeurs</Link>
          <Link className="hover:underline">Répertoire</Link>
          <Link className="hover:underline">Paramètres</Link>

          <Link to="https://jmighty.fr" className="hover:underline">
            © 2024 JMighty.fr | Ce clone de X.com a été créé uniquement à des fins éducatives dans
            le cadre d&apos;une formation. Aucune utilisation commerciale n&apos;est prévue ni
            envisagée. Tous les droits appartiennent à X Corp. Cette reproduction pédagogique
            n&apos;a pas vocation à porter atteinte à la marque X et sera retirée sur simple demande
            des ayants droit.
          </Link>
        </motion.div>
      </motion.div>

      {/* Loading */}
      {loading ? (
        <div className="fixed inset-0 bg-[#15202b] bg-opacity-50 flex justify-center items-center">
          <LogoX />
        </div>
      ) : null}

      {/* Login Popup avec animations */}
      <AnimatePresence>
        {loginPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white bg-opacity-10 backdrop-blur-[1px]"
              onClick={() => setLoginPopup(false)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              className="fixed inset-0 flex justify-center items-center"
              onClick={(e) => e.stopPropagation()}>
              <motion.div
                className="bg-[#15202B] p-8 rounded-lg w-96"
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", damping: 20 }}>
                <div className="text-center mb-5">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 0.5,
                    }}>
                    <LogoX width="w-12" />
                  </motion.div>
                </div>
                <form
                  onSubmit={handleSubmitLogin(onLoginSubmit)}
                  className="flex flex-col space-y-4 w-80 text-black">
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    type="email"
                    placeholder="Adresse email"
                    autoFocus
                    ref={emailLoginRef}
                    className={`p-3 bg-slate-100 border-none rounded h-10 ${
                      errorsLogin.emailLogin ? "outline-red-400" : ""
                    }`}
                    {...registerLogin("emailLogin", {
                      required: true,
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i,
                        message: "Veuillez entrer une adresse e-mail valide.",
                      },
                    })}
                  />
                  <motion.input
                    whileFocus={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    type="password"
                    placeholder="Mot de passe"
                    ref={passwordLoginRef}
                    className={`p-3 border border-gray-300 rounded h-10 ${
                      errorsLogin.passwordLogin ? "outline-red-400" : ""
                    }`}
                    {...registerLogin("passwordLogin", {
                      required: true,
                      minLength: {
                        value: 8,
                        message: "Le mot de passe doit contenir au moins 8 caractères.",
                      },
                      maxLength: {
                        value: 50,
                        message: "Le mot de passe doit contenir au maximum 50 caractères.",
                      },
                    })}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="p-2 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full font-bold">
                    Se connecter
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setLoginPopup(false)}
                    className="p-2 bg-[#EFF3F4] hover:bg-[#D7DBDC] text-[#0F1419] rounded-full font-bold block text-center w-80 mt-4">
                    Annuler
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
