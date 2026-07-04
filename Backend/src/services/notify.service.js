import axios from 'axios'

export const sendNotification = async ({to,subject,body})=>{
    try{const response = await axios.post(`${process.env.NOTIFYFLOW_URL}/api/v1/notify`,{ to, subject, body },
                                {headers: {'x-api-key': process.env.NOTIFYFLOW_API_KEY}}
                            )
    return response.data;
    }
    catch(err){
        console.error('NotifyFlow error:', err.message);
        return null;
    }
}