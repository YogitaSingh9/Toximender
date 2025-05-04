export interface CommentDataType {
  id: string;
  author: {
    id: string;
  };
  postId: string;
  date: number;
  comment: string;
  toxicityLevel?: string; // new optional field
  counterfactSuggestion?: string; // new optional field
}
