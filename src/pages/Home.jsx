import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../store/authContext";
import { SearchContext } from "../store/searchContext";
import { NavLink, Navigate } from "react-router-dom";
import Loading from "../components/Loading/Loading";
import { ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { user, loading } = useContext(AuthContext);
  const { searchQuery } = useContext(SearchContext);
  const queryClient = useQueryClient();
  const [isMySubscriptions, setIsMySubscriptions] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [replyToTweet, setReplyToTweet] = useState(null);
  const replyTextRef = useRef("");
  const [selectedTweet, setSelectedTweet] = useState(null);
  const [selectedTweetForDeletion, setSelectedTweetForDeletion] = useState(null);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!user) return;
      try {
        const response = await fetch(
          `https://passerelle-x-default-rtdb.europe-west1.firebasedatabase.app/subscriptions/${user.uid}.json`
        );
        const data = await response.json();
        if (data) {
          setSubscriptions(Object.values(data));
        }
      } catch (error) {
        toast.error("Erreur lors du chargement des abonnements : " + error.message);
      }
    };

    fetchSubscriptions();
  }, [user]);

  const fetchTweets = async () => {
    const tweetsResponse = await fetch(
      `https://passerelle-x-default-rtdb.europe-west1.firebasedatabase.app/tweets.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const tweets = await tweetsResponse.json();
    if (!tweets) {
      return [];
    }
    return Object.keys(tweets).map((key) => ({
      id: key,
      ...tweets[key],
    }));
  };

  const refTextArea = useRef("");

  const {
    data: tweets,
    isError,
    error,
  } = useQuery({
    queryKey: ["tweets"],
    queryFn: fetchTweets,
    staleTime: 10000, // 10 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes (par défaut)
  });

  useEffect(() => {
    if (isError) {
      toast.error(error.message, {
        autoClose: 2000,
      });
    }
  }, [isError, error]);

  const onBeforeSubmitHandler = (e) => {
    e.preventDefault();
    let isValid = true;
    // Check if the textarea is empty or has more than 280 characters
    if (
      !refTextArea.current.value ||
      refTextArea.current.value.trim() === "" ||
      refTextArea.current.value.length > 280 ||
      refTextArea.current.value.length < 1
    ) {
      isValid = false;
    }

    if (isValid) {
      postNewTweet();
    } else {
      refTextArea.current.focus();
      toast.error("Le tweet doit contenir entre 1 et 280 caractères", {
        autoClose: 2000,
      });
    }
  };

  const postNewTweet = async () => {
    const newTweet = {
      content: refTextArea.current.value,
      date: new Date().toISOString(),
      userId: user.uid,
      displayName: user.displayName,
    };

    const response = await fetch(
      "https://passerelle-x-default-rtdb.europe-west1.firebasedatabase.app/tweets.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTweet),
      }
    );

    if (response.ok) {
      refTextArea.current.value = "";
      // Invalidate and refetch
      await queryClient.invalidateQueries(["tweets"]);
      toast.success("Message publié !", {
        autoClose: 2000,
      });
    } else {
      toast.error("Une erreur est survenue...", {
        autoClose: 2000,
      });
    }
  };

  const handleDeleteTweet = async (tweetId) => {
    try {
      const response = await fetch(
        `https://passerelle-x-default-rtdb.europe-west1.firebasedatabase.app/tweets/${tweetId}.json`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        await queryClient.invalidateQueries(["tweets"]);
        toast.success("Tweet supprimé !", {
          autoClose: 2000,
        });
      } else {
        throw new Error("Erreur lors de la suppression");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression du tweet : " + error.message, {
        autoClose: 2000,
      });
    }
  };

  const handleReply = async (e, tweetId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!replyTextRef.current.value.trim() || replyTextRef.current.value.length > 280) {
      toast.error("La réponse doit contenir entre 1 et 280 caractères", {
        autoClose: 2000,
      });
      return;
    }

    const reply = {
      content: replyTextRef.current.value,
      date: new Date().toISOString(),
      userId: user.uid,
      displayName: user.displayName,
      replyTo: tweetId,
    };

    try {
      const response = await fetch(
        "https://passerelle-x-default-rtdb.europe-west1.firebasedatabase.app/tweets.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reply),
        }
      );

      if (response.ok) {
        await queryClient.invalidateQueries(["tweets"]);
        setReplyToTweet(null);
        replyTextRef.current.value = "";
        toast.success("Réponse publiée !", {
          autoClose: 2000,
        });
      }
    } catch (error) {
      toast.error("Erreur lors de la publication de la réponse : " + error.message, {
        autoClose: 2000,
      });
    }
  };

  // Ajouter cette fonction pour compter les réponses
  const getReplyCount = (tweetId) => {
    return tweets?.filter((tweet) => tweet.replyTo === tweetId).length || 0;
  };

  // Modifier la condition de chargement
  if (loading || !user) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Filtre les tweets en fonction de la recherche
  const filteredTweets = tweets?.filter((tweet) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      tweet.content.toLowerCase().includes(searchLower) ||
      tweet.displayName.toLowerCase().includes(searchLower);

    // N'afficher que les tweets qui ne sont pas des réponses
    const isNotReply = !tweet.replyTo;

    if (isMySubscriptions) {
      return matchesSearch && subscriptions.includes(tweet.displayName) && isNotReply;
    }
    return matchesSearch && isNotReply;
  });

  // Ajouter une fonction pour obtenir les réponses d'un tweet
  const getTweetReplies = (tweetId) => {
    return tweets
      ?.filter((tweet) => tweet.replyTo === tweetId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full grid grid-cols-2 auto-rows-max basis-1/2">
      {!selectedTweet && (
        <>
          <motion.button
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            whileTap={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            onClick={() => setIsMySubscriptions(false)}
            className={`text-white font-bold cursor-pointer inline-block w-full p-4 text-center col-span-1 ${
              !isMySubscriptions
                ? "underline underline-offset-[18px] decoration-4 decoration-[#1D9BF0]"
                : ""
            }`}>
            Pour vous
          </motion.button>
          <motion.button
            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            whileTap={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            onClick={() => setIsMySubscriptions(true)}
            className={`text-white font-bold cursor-pointer inline-block w-full p-4 text-center col-span-1 ${
              isMySubscriptions
                ? "underline underline-offset-[18px] decoration-4 decoration-[#1D9BF0]"
                : ""
            }`}>
            Abonnements
          </motion.button>
          <div className="col-span-2 border-t border-slate-700 border-collapse">
            <form className="flex items-start gap-3 p-4" onSubmit={onBeforeSubmitHandler}>
              <NavLink to={`/${user.displayName}`} className="flex items-center ">
                <img
                  src={`https://i.pravatar.cc/150?u=${user.displayName}`}
                  alt="avatar"
                  className="w-12 h-12 rounded-full"></img>
              </NavLink>
              <div className="w-full">
                <motion.textarea
                  whileFocus={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-full mt-2 text-white rounded-lg border-none outline-none bg-transparent resize-none font-medium text-lg"
                  placeholder="Quoi de neuf ?!"
                  rows={2}
                  ref={refTextArea}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onBeforeSubmitHandler(e);
                    }
                  }}
                />
                <div className="flex justify-end border-t border-slate-700 border-collapse">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-4 py-2 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full font-bold mt-3">
                    Poster
                  </motion.button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      <AnimatePresence mode="wait">
        {selectedTweet ? (
          <motion.div
            key="tweet-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="col-span-2">
            <button
              onClick={() => setSelectedTweet(null)}
              className="p-4 hover:bg-slate-800 text-white">
              ← Retour
            </button>
            <div className="border-t border-slate-700">
              {/* Tweet principal */}
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-start gap-3">
                  <NavLink to={`/${selectedTweet.displayName}`}>
                    <img
                      src={`https://i.pravatar.cc/150?u=${selectedTweet.displayName}`}
                      alt="avatar"
                      className="w-12 h-12 rounded-full"
                    />
                  </NavLink>
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{selectedTweet.displayName}</span>
                        <span className="text-gray-500 text-sm">
                          {new Date(selectedTweet.date).toLocaleDateString()}
                        </span>
                      </div>
                      {user && user.uid === selectedTweet.userId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTweet(selectedTweet.id);
                            setSelectedTweet(null);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm">
                          Supprimer
                        </button>
                      )}
                    </div>
                    <p className="mt-2">{selectedTweet.content}</p>
                  </div>
                </div>
              </div>

              {/* Zone de réponse */}
              {user && (
                <div className="p-4 border-b border-slate-700">
                  <form
                    onSubmit={(e) => handleReply(e, selectedTweet.id)}
                    className="flex items-start gap-3">
                    <NavLink to={`/${user.displayName}`} className="flex items-center">
                      <img
                        src={`https://i.pravatar.cc/150?u=${user.displayName}`}
                        alt="avatar"
                        className="w-12 h-12 rounded-full"
                      />
                    </NavLink>
                    <div className="w-full">
                      <textarea
                        ref={replyTextRef}
                        className="w-full mt-2 text-white rounded-lg border-none outline-none bg-transparent resize-none font-medium text-lg"
                        placeholder="Postez votre réponse"
                        rows={2}
                      />
                      <div className="flex justify-end border-t border-slate-700 border-collapse">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white rounded-full font-bold mt-3">
                          Répondre
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Réponses au tweet */}
              {getTweetReplies(selectedTweet.id)?.map((reply) => (
                <div key={reply.id} className="p-4 border-b border-slate-700 hover:bg-slate-800">
                  <div className="flex items-start gap-3">
                    <NavLink to={`/${reply.displayName}`}>
                      <img
                        src={`https://i.pravatar.cc/150?u=${reply.displayName}`}
                        alt="avatar"
                        className="w-12 h-12 rounded-full"
                      />
                    </NavLink>
                    <div className="w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{reply.displayName}</span>
                        <span className="text-gray-500 text-sm">
                          {new Date(reply.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2">{reply.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="tweet-list" className="col-span-2">
            {filteredTweets
              ?.slice()
              .reverse()
              .map((tweet) => (
                <motion.div
                  key={tweet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{
                    scale: 1.01,
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    transition: { duration: 0.1 },
                  }}
                  // Supprimer ces classes qui créent un conflit
                  className="cursor-pointer border-solid border-y border-slate-700 border-collapse col-span-2 flex items-start gap-3 p-4"
                  onClick={() => setSelectedTweet(tweet)}
                  onMouseEnter={() => setSelectedTweetForDeletion(tweet.id)}
                  onMouseLeave={() => setSelectedTweetForDeletion(null)}>
                  <div>
                    <NavLink to={`/${tweet.displayName}`} className="w-12 h-12 rounded-full">
                      <img
                        src={`https://i.pravatar.cc/150?u=${tweet.displayName}`}
                        alt="avatar"
                        className="w-12 h-12 rounded-full"></img>
                    </NavLink>
                  </div>
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{tweet.displayName}</span>
                      <span className="text-gray-500 text-sm">
                        {(() => {
                          const posted = new Date(tweet.date);
                          const now = new Date();
                          const diff = Math.floor((now - posted) / 1000);
                          if (diff < 30) return "à l'instant";
                          if (diff < 60) return `${diff} sec`;
                          if (diff < 3600) return `${Math.floor(diff / 60)} min`;
                          if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
                          // return date formatée
                          return posted.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          });
                        })()}
                      </span>
                    </div>
                    <p className="mt-2">{tweet.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-gray-500 group">
                        <div className="p-2 rounded-full group-hover:bg-[#1D9BF0] group-hover:bg-opacity-10">
                          <ChatBubbleLeftIcon className="h-5 w-5 group-hover:text-[#1D9BF0]" />
                        </div>
                        <span className="text-sm group-hover:text-[#1D9BF0]">
                          {getReplyCount(tweet.id)}
                        </span>
                      </div>
                      {user &&
                        user.uid === tweet.userId &&
                        selectedTweetForDeletion === tweet.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTweet(tweet.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-sm">
                            Supprimer
                          </button>
                        )}
                    </div>
                    {replyToTweet === tweet.id && (
                      <form
                        onSubmit={(e) => handleReply(e, tweet.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 border-t border-slate-700 pt-2">
                        <textarea
                          ref={replyTextRef}
                          className="w-full bg-transparent text-white rounded p-2 border border-slate-700"
                          placeholder="Votre réponse"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyToTweet(null);
                            }}
                            className="px-4 py-1 text-gray-400 hover:text-white">
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600">
                            Répondre
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
