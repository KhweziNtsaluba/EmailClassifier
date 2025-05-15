
import csv
import pandas as pd
import re
import csv
import sys
import uuid
import numpy as np
import sklearn
import joblib
from fastapi import FastAPI
import uvicorn
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from lime.lime_text import LimeTextExplainer

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REGEX_PATTERNS = {
    'currency': r'[$€£¥]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP|JPY|CAD|AUD|CHF)',

    'time': r'\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*[aApP][mM])?\b',

    'day' : r'(?i) (sun|mon|tue(s)?|wed(nesday)?|thu(r(s)?)?|fri)(day|\.)? ', # note the spaces at the beginning and end

    'date': r'(?i)\b(?:\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:[a-z]{2})?,?\s+\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:\s?[—-]\s?\d{1,2})?)\b',

    'phone': r'^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$',

    'percentage': r'\b(?<!\.)(?!0+(?:\.0+)?%)(?:\d|[1-9]\d|100)(?:(?<!100)\.\d+)?%',

    'number': r'\b\d+(?:[.,]\d+)?\b',

    'email': r'(?:[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])',

    'url' : r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
}
  
def to_lowercase(df, text_column='body'):
  df_copy = df.copy()

  df_copy[text_column] = df_copy[text_column].apply(
      lambda x: x.lower() if isinstance(x, str) else x
  )

  return df_copy

def replace_data_categories(text):
    modified_text = text

    modified_text = re.sub(REGEX_PATTERNS['currency'], '<cur>', modified_text) # currency
    modified_text = re.sub(REGEX_PATTERNS['time'], '<time>', modified_text) # times
    modified_text = re.sub(REGEX_PATTERNS['day'], '<day>', modified_text) # times
    modified_text = re.sub(REGEX_PATTERNS['date'], '<date>', modified_text) # dates
    modified_text = re.sub(REGEX_PATTERNS['phone'], '<phone>', modified_text) # phone numbers
    modified_text = re.sub(REGEX_PATTERNS['percentage'], '<perc>', modified_text) # percentages
    modified_text = re.sub(REGEX_PATTERNS['number'], '<num>', modified_text) # general numbers

    return modified_text

def extract_urls_from_text(text):
    if not isinstance(text, str):
        return []

    url_pattern = re.compile(REGEX_PATTERNS['url'])
    return url_pattern.findall(text)

def replace_urls_with_tag(text):
    if not isinstance(text, str):
        return text

    url_pattern = re.compile(REGEX_PATTERNS['url'])
    return url_pattern.sub('<URL>', text)


def process_email_data(df):

    print(f"Original dataframe shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")

    url_data = []

    # ID to link URLs back to emails
    df['email_id'] = [str(uuid.uuid4()) for _ in range(len(df))]

    # Extract and replace URLs -- Subject to further processing
    for idx, row in df.iterrows():
        email_id = row['email_id']
        body = row['body']

        urls = extract_urls_from_text(body)

        for url in urls:
            url_data.append(url)

        # Replace urls
        df.at[idx, 'body'] = replace_urls_with_tag(body)

        # Replace data categories
        df.at[idx, 'body'] = replace_data_categories(row['body'])

    # Lowercase
    df = to_lowercase(df)

    # Create URL dataframe
    url_df = pd.DataFrame(url_data)

    print(f"Modified dataframe shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"URL dataframe shape: {url_df.shape}")

    return df, url_df

MODEL_PATH = "body_classifier.joblib"

def custom_tokenizer(text):
    pattern = r"\w+|[^\s\w]"
    return re.findall(pattern, text)

def predict(subject: str, body: str, num_features: int):
    email = {
        "subject": [subject],
        "body": [body]
    }

    df = pd.DataFrame(email)
    df, url_df = process_email_data(df)

    clf = joblib.load(MODEL_PATH)

    prediction = clf.predict([df.iloc[0]['body']])
    probability = clf.predict_proba([df.iloc[0]['body']])
    explainer = LimeTextExplainer(class_names=["benign","phishing"], split_expression=custom_tokenizer, random_state=1)
    exp = explainer.explain_instance(df.iloc[0]['body'], clf.predict_proba, num_features=num_features, labels=[1])
    
    # normalizing weights
    word_weights = dict(exp.as_list())

    # Normalize weights to range [-1, 1]
    max_abs_weight = max(abs(w) for w in word_weights.values())
    normalized_words = {word: weight / max_abs_weight for word, weight in word_weights.items()}

    return {
        "predicted_class": int(prediction[0]), 
        "confidence": float(max(probability[0])),
        "list": normalized_words
    }


class Item(BaseModel):
    subject: str | None = None
    body: str
    num_features: int = 10

@app.get("/")
async def root():
   return {"message": "Hello World"}

@app.post("/")
async def classifyEmail(item: Item):
    return predict(item.subject,item.body,item.num_features)

if __name__ == "__main__":
   uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)