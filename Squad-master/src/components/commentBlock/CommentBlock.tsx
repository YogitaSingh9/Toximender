import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useUserData } from '../../hooks/useUsers';
import { CommentDataType } from '../../types/commentData.type';
import Avatar from '../avatar/Avatar';
import s from './CommentBlock.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { auth } from '../../firebase';
import { useComments } from '../../hooks/useComments';

const CommentBlock: React.FC<CommentDataType & { postId: string }> = ({
  id,
  author,
  comment,
  date,
  postId,
  toxicityLevel,
  counterfactSuggestion,
}) => {
  const { userData } = useUserData(author.id);
  const { deleteComment } = useComments();

  async function handleCommentDelete() {
    try {
      await deleteComment(id, postId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  }

  return (
    <div className={s.root} style={{ border: (toxicityLevel === 'moderate' || toxicityLevel === 'high') ? '2px solid red' : undefined, padding: '10px', borderRadius: '8px' }}>
      <div className={s.avatar}>
        <Avatar id={author.id} />
      </div>
      <div className={s.commentDetails}>
        <div className={s.info}>
          <h4>{userData && userData.firstName + ' ' + userData.lastName}</h4>
          <span>{formatDistanceToNow(date)} ago</span>
        </div>
        <div className={s.commentText}>
          <span>{comment}</span>
          {(toxicityLevel === 'moderate' || toxicityLevel === 'high') && (
            <div style={{ marginTop: '8px', color: 'red', fontWeight: 'bold' }}>
              Toxic comment detected.
              {counterfactSuggestion && (
                <div style={{ marginTop: '4px', fontWeight: 'normal', fontStyle: 'italic', color: '#b22222' }}>
                  Suggested alternative: {counterfactSuggestion}
                </div>
              )}
            </div>
          )}
          <div className={s.commentActions}>
            {auth.currentUser?.uid === author.id && (
              <FontAwesomeIcon icon={faTrashAlt} onClick={handleCommentDelete} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentBlock;
