import React from 'react';
import { useComments } from '../../hooks/useComments';
import { CommentDataType } from '../../types/commentData.type';
import CommentBlock from '../commentBlock/CommentBlock';

interface CommentsListType {
  postID: string;
}
const CommentsList: React.FC<CommentsListType> = ({ postID }) => {
  const { comments, getComments } = useComments();

  React.useEffect(() => {
    console.log('CommentsList mounted for postID:', postID);
    let unsubscribe: (() => void) | undefined;

    try {
      const unsubPromise = getComments(postID);
      unsubPromise.then((unsub) => {
        if (typeof unsub === 'function') {
          unsubscribe = unsub;
        }
      }).catch(error => {
        console.error('Failed to get comments:', error);
      });
    } catch (error) {
      console.error('Component error:', error);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('CommentsList unsubscribed for postID:', postID);
      }
      console.log('CommentsList unmounted');
    };
  }, [postID]);

  console.log('CommentsList received comments:', comments)
  return (
    <>
      {comments?.map((comment: CommentDataType) => {
        return (
          <CommentBlock
            key={comment.id}
            {...comment}
            postId={postID}
            toxicityLevel={comment.toxicityLevel}
            counterfactSuggestion={comment.counterfactSuggestion}
          />
        );
      })}
    </>
  );
};

export default CommentsList;
