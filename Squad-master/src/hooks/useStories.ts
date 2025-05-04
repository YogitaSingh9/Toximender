import React from 'react';
import swal from 'sweetalert';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp 
} from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { uuidv4 } from '@firebase/util';
import { auth, db, storage } from "../firebase";
import { StoryDataType } from '../types/storyData.type';

export const useStories = () => {
  const [stories, setStories] = React.useState<StoryDataType[]>([]);
  const [storyImages, setStoryImages] = React.useState<string[]>([]);

  async function uploadStory(story: string) {
    if (!auth.currentUser?.uid) {
      swal("Error", "You must be logged in to upload stories", "error");
      return;
    }

    if (!story) {
      swal("Warning", "Please select an image first", "warning");
      return;
    }

    try {
      const fileRef = ref(storage, `storyImages/${auth.currentUser.uid}/${uuidv4()}.png`);
      await uploadString(fileRef, story, 'data_url');
      const storyImageURL = await getDownloadURL(fileRef);

      const storyData = {
        author: {
          id: auth.currentUser.uid,
          name: auth.currentUser.displayName || ''
        },
        image: storyImageURL,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).getTime()
      };
      
      console.log('Creating story with data:', storyData);
      await addDoc(collection(db, 'stories'), storyData);

      swal("Success", "Story published successfully!", "success");
    } catch (error: unknown) {
      console.error("Story upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to publish story";
      swal("Error", errorMessage, "error");
    }
  }

  const getStories = React.useCallback(() => {
    const q = query(collection(db, "stories"), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      console.log('Fetched stories snapshot:', snapshot);
      const storiesData = snapshot.docs.map(doc => {
        console.log('Story doc:', doc.id, doc.data());
        return {
          id: doc.id,
          ...doc.data()
        } as StoryDataType;
      });
      console.log('Processed stories data:', storiesData);
      setStories(storiesData);
    });
  }, []);

  const getStoryImages = React.useCallback(() => {
    const q = query(collection(db, "stories"), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const images = snapshot.docs.map(doc => doc.data().image as string);
      setStoryImages(images);
    });
  }, []);

  React.useEffect(() => {
    const unsubscribeStories = getStories();
    const unsubscribeImages = getStoryImages();
    return () => {
      unsubscribeStories();
      unsubscribeImages();
    };
  }, [getStories, getStoryImages]);

  return { 
    stories, 
    storyImages, 
    uploadStory,
    getStories,
    getStoryImages
  };
}
