import pandas as pd
from sklearn.model_selection import train_test_split
from toxic_classifier import ToxicClassifier
import os
import numpy as np
from datetime import datetime
import json

def load_and_prepare_data(file_path, sample_size=5000):
    """Load and prepare data with improved sampling and validation"""
    # Load the toxic comments dataset
    df = pd.read_csv(file_path)
    
    # Take a balanced sample for training
    toxic_samples = df[df['toxic'] == 1].sample(min(sample_size//2, len(df[df['toxic'] == 1])))
    non_toxic_samples = df[df['toxic'] == 0].sample(min(sample_size//2, len(df[df['toxic'] == 0])))
    df_sample = pd.concat([toxic_samples, non_toxic_samples])
    
    # Improved toxicity level classification with weighted scoring
    def get_toxicity_level(row):
        # Define weights for different types of toxicity
        weights = {
            'severe_toxic': 2.0,  # Reduced weight
            'toxic': 1.0,         # Base weight
            'obscene': 1.0,       # Base weight
            'threat': 2.0,        # Base weight
            'insult': 2.0,        # Increased weight for insults
            'identity_hate': 2.0   # Base weight
        }
        
        # Calculate weighted score
        score = sum(row[col] * weights[col] for col in weights.keys())
        
        # Classify based on weighted score with adjusted thresholds
        if score >= 2.0 or row['severe_toxic'] == 1:  # Lower threshold for high toxicity
            return 'high'
        elif score >= 0.8 or row['toxic'] == 1 or row['insult'] == 1:  # Lower threshold for moderate
            return 'moderate'
        else:
            return 'low'
    
    df_sample['toxicity_level'] = df_sample.apply(get_toxicity_level, axis=1)
    
    print(f"Using {len(df_sample)} samples for training")
    print("Toxicity distribution:")
    print(df_sample['toxicity_level'].value_counts())
    
    return df_sample['comment_text'].values, df_sample['toxicity_level'].values

def save_training_metrics(metrics, model_dir='checkpoints'):
    """Save training metrics to a JSON file"""
    os.makedirs(model_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    metrics_file = os.path.join(model_dir, f'training_metrics_{timestamp}.json')
    
    with open(metrics_file, 'w') as f:
        json.dump(metrics, f, indent=4)

def main():
    # Initialize the classifier
    classifier = ToxicClassifier()
    
    try:
        # Check if best model exists
        best_model_path = os.path.join('checkpoints', 'best_model.pt')
        if os.path.exists(best_model_path):
            print("Loading existing best model...")
            classifier.load_checkpoint(best_model_path)
        else:
            print("No existing model found. Starting training...")
            # Load and prepare the data with balanced sample
            texts, labels = load_and_prepare_data('./train.csv', sample_size=5000)
            
            # Split the data with stratification
            train_texts, val_texts, train_labels, val_labels = train_test_split(
                texts, labels, test_size=0.2, random_state=42, stratify=labels
            )
            
            # Learn counterfactual patterns from the training data
            print("Learning counterfactual patterns...")
            classifier.learn_counterfactual_patterns(train_texts, train_labels)
            
            # Train the model with optimized parameters
            print("Training the model...")
            training_metrics = classifier.train(
                train_texts,
                train_labels,
                val_texts,
                val_labels,
                batch_size=32,      # Reduced batch size
                epochs=10,          # Increased epochs
                learning_rate=2e-5, # Adjusted learning rate
                patience=3          # Increased patience
            )
            
            # Save training metrics
            save_training_metrics(training_metrics)
        
        # Test with diverse examples
        test_texts = [
            "You are an idiot and I hate you!",
            "I disagree with your opinion.",
            "This is a neutral comment.",
            "You're so stupid, I can't believe you said that!",
            "That's a terrible idea, you moron!",
            "I think we should consider other options.",
            "Your work needs improvement.",
            "This is not acceptable behavior.",
            "I strongly disagree with your approach.",
            "Let's find a better solution together."
        ]
        
        print("\nTesting the classifier with example texts:")
        test_results = []
        for text in test_texts:
            toxicity_level, probabilities = classifier.classify_toxicity(text)
            print(f"\nText: {text}")
            print(f"Toxicity level: {toxicity_level}")
            print(f"Probabilities: {probabilities}")
            
            # Generate counterfactual using learned patterns
            counterfactual = classifier.generate_counterfactual(text)
            print(f"Counterfactual: {counterfactual}")
            
            # Classify the counterfactual
            counter_level, counter_probs = classifier.classify_toxicity(counterfactual['text'])
            print(f"Counterfactual toxicity level: {counter_level}")
            
            test_results.append({
                'text': text,
                'toxicity_level': toxicity_level,
                'probabilities': probabilities,
                'counterfactual': counterfactual,
                'counterfactual_toxicity': counter_level
            })
        
        # Save test results
        save_training_metrics({'test_results': test_results}, 'test_results')
    
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 