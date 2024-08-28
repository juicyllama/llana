import dotenv from 'dotenv'
import fs from 'fs'

/**
 * Get the value of an environment variable based on the key provided
 */
export function get(key: string) {
    dotenv.config();
    return process.env[key];

}

/**
 * Sets the value of an environment variable based on the key provided only if the value is empty or does not exist
 */
export function set(key: string, value: string) {
   
    const currentValue = get(key)

    if (currentValue) {
        if (currentValue.trim() === '') {
            patch(key, value)
        } 
    } else {
        patch(key, value)
    }
}

/**
 * Updates the environment variable with the new value provided
 */
export function patch(key: string, value: string){
    const envContent = fs.readFileSync(`.env`, 'utf-8');
    const envLines = envContent.split('\n');
  
    let newLines = envLines.map((line) => {
        const [envKey] = line.split('=');
        if (envKey === key) {
          return `${key}=${value}`;
        }
        return line;
    });
    
      // If the key doesn't exist in the file, add a new line for it
    if (!newLines.some((line) => line.startsWith(`${key}=`))) {
        newLines = [...newLines, `${key}=${value}`];
    }
    
    const newEnvContent = newLines.join('\n');
    fs.writeFileSync(`.env`, newEnvContent, 'utf-8');
}