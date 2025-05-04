import React from 'react'
import swal from 'sweetalert';

import { PostDataType } from './../types/postData.type';
import { collection, addDoc, onSnapshot, query, orderBy, where, } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { uuidv4 } from '@firebase/util';
import { auth, db, storage } from "../firebase";

interface IncomingPostType {
  text: string,
  image: File | undefined;
}
export const usePost = () => {
  const [posts, setPosts] = React.useState<PostDataType[]>()

  async function uploadPost(post: IncomingPostType) {
    console.log('Starting post upload', post);
    const fileRef = ref(storage, 'postImages/' + uuidv4() + '.png');
    console.log('File reference created:', fileRef.fullPath);
    
    if (post.text !== '' && !post.image) {
      console.log('Creating text-only post');
      const postCollectionRef = collection(db, 'posts');
      await addDoc(postCollectionRef, {
        id: uuidv4(),
        author: {
          id: auth.currentUser?.uid,
        },
        text: post.text,
        likes: [],
        date: Date.now()
      });
      swal({
        title: "Your post has been added!",
        icon: "success",
      });
    }
    else if (post.image) {
      try {
        console.log('Starting image upload', post.image);
        await uploadBytes(fileRef, post.image, { 
          contentType: post.image.type,
          customMetadata: {
            'Cache-Control': 'public,max-age=3600'
          }
        });
        console.log('Image uploaded successfully');
        
        const imageURL = await getDownloadURL(fileRef);
        console.log('Got image URL:', imageURL);
        
        const postData: any = {
          id: uuidv4(),
          author: {
            id: auth.currentUser?.uid,
          },
          likes: [],
          date: Date.now(),
          image: imageURL
        };

        if (post.text) postData.text = post.text;

        const postCollectionRef = collection(db, 'posts');
        console.log('Post data to save:', postData);
        const docRef = await addDoc(postCollectionRef, postData);
        console.log('Post created with ID:', docRef.id);
        
        swal({
          title: "Your post has been added!",
          icon: "success",
        });
      } catch (e: any) {
        swal({
          title: "Oops ErRoR!",
          text: e.message,
          icon: "error",
        });
      }
    }
    else {
      swal({
        title: "You must fill at least one field!",
        icon: "warning",
      });
    }
  }

  const getPosts = async () => {
    const q = query(collection(db, "posts"), orderBy('date', 'desc'));
    onSnapshot(q, (data) => {
      const dataa = data.docs.map((doc) => ({ ...doc.data() as Record<string, unknown>, id: doc.id })) as any
      setPosts(dataa)
    })
  }
  const getUserPosts = async (id: string) => {
    const q = query(collection(db, "posts"), where('author.id', '==', id), orderBy('date', 'desc'));
    onSnapshot(q, (data) => {
      const dataa = data.docs.map((doc) => ({ ...doc.data() as Record<string, unknown>, id: doc.id })) as any
      setPosts(dataa)
    })
  }
  return { posts, getUserPosts, getPosts, uploadPost }
}