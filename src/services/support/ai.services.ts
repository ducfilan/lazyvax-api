export const queryChatGPT = async function (prompt) {
  const openaiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';
  const headers = {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const data = {
    prompt: `${prompt}`,
    max_tokens: 100,
    n: 1,
    stop: null,
    temperature: 0.8,
  };

  try {
    // const response = await axios.post(openaiUrl, data, { headers });
    // return response.data.choices[0].text;
  } catch (error) {
    console.error(`Error querying ChatGPT API: ${error.message}`);
    return null;
  }
}