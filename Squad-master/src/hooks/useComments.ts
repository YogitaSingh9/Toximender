import React from 'react';
import { CommentDataType } from './../types/commentData.type';
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import swal from 'sweetalert';

export const useComments = () => {
  const [comments, setComments] = React.useState<CommentDataType[]>([]);

  async function onAddComment(
    postId: string,
    comment: string,
    setComment?: (arg: string) => void
  ) {
    if (comment && postId) {
      try {
        console.log('Sending comment for toxicity analysis:', comment);
        const analyzeResponse = await fetch('http://localhost:5000/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: comment }),
        });

        if (!analyzeResponse.ok) {
          console.error(
            'Toxicity analysis API response not OK:',
            analyzeResponse.status,
            await analyzeResponse.text()
          );
          throw new Error(`Failed to analyze comment toxicity: ${analyzeResponse.status}`);
        }

        const analyzeData = await analyzeResponse.json();
        console.log('Toxicity analysis response:', analyzeData);

        const toxicityLevel = analyzeData.toxicity_analysis?.level || 'unknown';
        const counterfactSuggestion = analyzeData.counterfact || null;

        if (toxicityLevel === 'high' || toxicityLevel === 'moderate') {
          await swal({
            title: 'Toxic Comment Detected',
            text: `Your comment was detected as toxic. Suggested alternative: "${
              counterfactSuggestion || 'No suggestion available'
            }"`,
            icon: 'warning',
            buttons: ['Cancel', 'Use Suggested Comment'],
            dangerMode: true,
          }).then(async (willUseSuggestion) => {
            if (willUseSuggestion) {
              if (setComment) setComment(counterfactSuggestion || '');
              await addCommentToFirestoreWithDetails(
                postId,
                counterfactSuggestion || '',
                toxicityLevel,
                counterfactSuggestion
              );
              console.log('Added suggested comment to Firestore');
            } else {
              if (setComment) setComment('');
              console.log('User cancelled adding toxic comment');
            }
          });
        } else {
          await addCommentToFirestoreWithDetails(postId, comment, toxicityLevel);
          console.log('Added comment to Firestore');
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Error during toxicity check:', error.message);
          console.error('Full error details:', error);
          alert('Error during toxicity check: ' + error.message);
        } else {
          console.error('Unknown error during toxicity check:', error);
          alert('Unknown error during toxicity check');
        }
        await swal({
          title: 'Error',
          text: 'Could not check comment toxicity. Comment will be added.',
          icon: 'error',
        });
        try {
          await addCommentToFirestoreWithDetails(postId, comment);
          console.log('Added comment to Firestore despite toxicity check error');
        } catch (firestoreError) {
          console.error('Error adding comment to Firestore:', firestoreError);
          alert('Failed to add comment to database.');
        }
      }
    } else {
      alert('Write some comment');
    }
  }

  async function addCommentToFirestore() {
    // This function is no longer used but kept for reference
  }

  async function addCommentToFirestoreWithDetails(
    postId: string,
    text: string,
    toxicityLevel?: string,
    counterfactSuggestion?: string
  ) {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    await addDoc(commentsRef, {
      author: {
        id: auth.currentUser?.uid,
      },
      comment: text,
      date: Date.now(),
      toxicityLevel: toxicityLevel || null,
      counterfactSuggestion: counterfactSuggestion || null,
    });
  }

  async function getComments(postId: string) {
    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (data) => {
        const commentsData = data.docs.map((doc) => ({
          id: doc.id,
          author: doc.data().author,
          comment: doc.data().comment,
          date: doc.data().date,
        } as CommentDataType));
        setComments(commentsData);
      },
      (error) => console.error('Comments error:', error)
    );

    return unsubscribe;
  }

  async function deleteComment(commentId: string, postId: string) {
    if (!postId) {
      console.error('deleteComment called without postId');
      return;
    }
    if (!commentId) {
      console.error('deleteComment called without commentId');
      return;
    }
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
  
    try {
      const willDelete = await swal({
        title: 'Are you sure?',
        text: 'Once deleted this comment, you will not be able to recover it.',
        icon: 'warning',
        dangerMode: true,
        buttons: ['Cancel', 'Delete'],
      });
  
      if (willDelete) {
        await deleteDoc(commentRef);
        swal('Poof! Your comment has been deleted!', {
          icon: 'success',
        });
        console.log(`Deleted comment ${commentId} from post ${postId}`);
      } else {
        console.log('User cancelled comment deletion');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        swal(error.message, {
          icon: 'error',
        });
        console.error('Error deleting comment:', error.message);
      } else {
        swal('An unknown error occurred', {
          icon: 'error',
        });
        console.error('Unknown error deleting comment');
      }
    }
  }
  

  return {
    comments,
    getComments,
    onAddComment,
    deleteComment,
  };
};
