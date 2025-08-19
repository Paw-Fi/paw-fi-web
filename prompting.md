Prompting for agents is a topic that builds upon the basics of prompting, and it involves programming in natural language to communicate with an agent, such as one playing Pokémon, with the goal of accomplishing a task, and this concept is introduced by Hannah and Jeremy, who are part of the applied AI team in Anthropic 00:00:05
The process of prompting for agents differs from basic console prompting, as it does not require a highly structured prompt, and instead, allows for more flexibility and the incorporation of various elements, with Hannah noting that the team's approach to console prompting should not be applied to agents 00:01:03
At Anthropic, an agent is defined as a model that uses tools in a loop to continuously work on a task, updating its decisions based on the information it receives from its tool calls, and this process is facilitated by the environment, tools, and system prompt, which should be kept simple to allow the agent to do its work effectively 00:01:46
Agents are best suited for complex and valuable tasks, and their use is not always necessary, as other approaches may be more appropriate, with Jeremy and Hannah emphasizing the importance of considering the complexity and value of a task before deciding to use an agent 00:02:18
A checklist for determining when to use an agent includes assessing whether the task is complex, valuable, and requires a step-by-step process that may not be clear, with examples of tasks that may not require an agent including those that can be easily thought through by a human, and Hannah and Jeremy providing guidance on how to evaluate the suitability of an agent for a particular task 00:02:46
When considering the use of agents, it's essential to evaluate whether the task is highly leveraged, revenue-generating, and valuable to the user, as well as complex, to determine if it's worth utilizing the resources of an agent 00:03:14
The task's doability is also crucial, and it's necessary to assess whether the agent can be provided with the required tools and information to accomplish the task, and if not, it may be necessary to scope the task down 00:03:29
The cost of errors and the ease of detecting and correcting them are also important factors to consider, as tasks with high error costs or difficulties in error detection may require human intervention, whereas tasks with low error costs or easy error correction can be handled independently by agents 00:04:00
Coding is a great use case for agents, as it's a high-value task that can save skilled engineers a significant amount of time, allowing them to focus on other high-leverage tasks, and agents like Claude are capable of performing coding tasks 00:04:30
Other examples of suitable use cases for agents include search, computer use, and data analysis, as these tasks can be recovered from in case of errors, and agents can be useful in handling complex tasks with uncertain processes, such as analyzing data with varying formats and potential errors 00:05:35
Data analysis is another interesting example, similar to coding, where the end result is known, but the process to get there is uncertain, and agents can be helpful in handling such tasks 00:06:05
A person with a rich experience in building agents is going to share best practices for prompting them well and structuring great prompts for agents 00:06:34
The person is expected to provide valuable information on how to effectively interact with agents through well-designed prompts 00:06:34
The introduction is made by someone named Hannah, who thanks the audience before handing over to the experienced agent builder 00:06:34
Jeremys introduction 00:06:46
Prompting for agents involves considering several key aspects, which have been learned through experiences of building agents, including the development of agents such as Cla Code, which works in the terminal 00:06:46
Cla Code is an agent that can be tried from Enthropic, and it browses files in an agent-like manner, utilizing the bash tool to accomplish tasks related to coding 00:07:01
Thinking like your agents 00:07:07
Advanced research features in cloud.ai enable hours of research, allowing users to find hundreds of startups or potential prospects, and the model can research across various tools, including Google Drive and web search, by understanding the environment and tools available to the agent 00:07:07
To effectively design tools and prompts for agents, it is essential to think like the agents and develop a mental model of what the agent is doing and its environment, which includes simulating the process and imagining how a human would perform the task 00:07:37
Prompt engineering is conceptual engineering, and as models get smarter, prompting will become more important, requiring clear concepts and behaviors for the model to perform well in a specific environment, such as the concept of irreversibility in cloud code 00:08:21
Agents need reasonable heuristics, such as avoiding irreversible actions, and it is crucial to instill these concepts in the model and consider edge cases where the model might misinterpret them, ensuring the model is crisp and clear about the concepts 00:08:51
Examples of reasonable heuristics include telling the model when to stop searching when it has found the answer and providing budgets for tool calls, such as limiting simple queries to under five tool calls, which requires articulating these heuristics clearly to the model 00:09:31
Effective prompting involves articulating concepts and behaviors clearly, similar to managing a new intern, and considering how the model will interpret and follow these guidelines, ensuring the model can perform tasks efficiently and effectively 00:10:02
When providing heuristics to agents, which are general principles to follow, it is essential to be crisp and clear about how to accomplish tasks, and these heuristics may not be strict rules but rather practices that the agent should follow 00:10:17
Tool selection is key, and as models become more powerful, they can handle more tools, but it is crucial to be clear about which tools the agent should use for different tasks, such as giving the model access to Google Drive, MCP tools, or GitHub for research 00:10:29
The agent needs explicit principles about when to use which tools and in which contexts, especially in a specific company context, such as defaulting to searching Slack for company-related information 00:10:59
Guiding the thinking process of the agent can squeeze more performance out of it, for example, by telling the model to plan out its search process, including deciding how complicated the query is and what sources to look for 00:11:43
The agent can be prompted to use interleaf thinking between tool calls to reflect on the quality of search results and decide if they need to be verified or if a disclaimer is needed 00:12:12
When prompting agents, it is essential to consider that they are more unpredictable than workflows or classification type prompts, and most changes will have unintended side effects due to their autonomous operation in a loop 00:12:56
Providing principles for the agent to follow, such as planning out its search process and using interleaf thinking, can help mitigate unintended side effects and improve the agent's performance 00:13:12
When working with agents, it is essential to inform them that it is acceptable to stop after a few tool calls if the perfect source is not found, and to be aware that prompts may have unintended side effects that may need to be rolled back 00:13:26
Agents have a context window, with Cloud 4 models having a 200k token context window, which can be extended using strategies such as compaction, a tool that summarizes or compresses the context window into a dense and accurate summary 00:13:41
Compaction allows the model to essentially run infinitely with cloud code, keeping most of the important details, although it may occasionally miss details from the previous session 00:14:12
Another strategy to extend the context window is to write to an external file, which the model can access, and Cloud 4 models are especially good at writing memory to a file 00:14:27
Using sub-agents is also an option, where a lead agent can delegate tasks to sub-agents, which can compress results into a dense form, allowing the lead agent to provide a final report to the user 00:14:57
A multi-agent system can be effective in limiting the context window, and this process is used in research systems to compress search results and only use the context window for the lead agent to write the report 00:15:12
It is recommended to start with a bare-bones prompt and tools, and see where the system goes wrong, rather than assuming that Claude, the agent, cannot perform a task, as it often surprises with its capabilities 00:15:42
Tools 00:15:58
A good tool should have a simple and accurate name that reflects its function, and it should be tested to ensure it works well, with a well-formed description that allows humans to understand and use it 00:15:58
The tool's description should be clear and usable, not just for humans, but also for agent computer interfaces, to facilitate effective interaction and avoid confusion 00:16:11
It is essential to keep tools distinct and avoid giving an agent multiple tools with similar names or descriptions, as this can confuse the model, and instead, combine similar tools into one 00:16:27
Providing an agent with a set of tools that are easy to understand and use is crucial, and tools with very similar names or descriptions, such as multiple search tools that search different databases, should be combined or simplified to avoid confusion 00:16:42
Example 00:16:49
An agent can utilize various tools to search the inventory in a database by running a query, and based on the information found, it can reflect on the inventory and think about it before deciding to generate an invoice 00:16:49
The agent can then generate the invoice, think about the next steps, and decide to send an email, demonstrating a loop where the agent retrieves information from its external environment, uses its tools, and updates based on that information 00:17:05
This process continues until the agent accomplishes its task, illustrating how agents generally work by interacting with their environment and using their tools to update and make decisions 00:17:19
Demo 00:17:24
The console is a useful tool for simulating prompts and understanding how agents work, allowing users to think like their agents and put themselves in their shoes, with the current prompt being around a thousand tokens and involving a research process 00:17:24
The prompt provides guidelines for the agent, including what to plan ahead of time, how many tool calls to use, and what facts to consider, such as what makes a high-quality source, and also instructs the agent to use parallel tool calls to run multiple web searches at the same time 00:17:53
The agent is given a question to answer, "How many bananas can fit in a Rivian R1S?", which requires it to search the web because it doesn't have the necessary information, and it breaks down the request and realizes that a web search is needed to get the cargo capacity 00:18:21
The agent runs two web searches in parallel, gets the results back quickly, and reflects on the results, using tool calls interled with thinking to find the dimensions of bananas, convert them to standard measurements, and estimate how many bananas can fit in the cargo space 00:18:35
The agent's estimate of approximately 48,000 bananas is roughly correct, although the actual answer is believed to be around 30,000, and this approach of testing out prompts and seeing how the model thinks can help identify issues and improve the agent's performance 00:19:31
Testing out prompts and analyzing the model's thinking can reveal problems, such as the model using too many tools, the wrong sources, or following incorrect guidelines, and this approach can help make the agents more concrete and effective 00:19:51
eval 00:20:17
Evaluations are crucial for measuring progress in a system, and they are particularly challenging for agents due to their complex and unpredictable processes, unlike classification tasks which are easier to evaluate 00:20:17
To make evaluations easier, it's essential to remember that a larger effect size requires a smaller sample size, allowing for a more manageable evaluation process, especially when starting out with a new prompt or system 00:20:48
Starting with a small evaluation and running it manually is recommended, as delaying evaluations can be a failure mode, and even a small number of test cases can provide great signal if kept consistent 00:21:04
Using realistic tasks that reflect the system's intended use is vital, such as giving a coding model tasks that mimic real-world coding, rather than competitive programming problems, to accurately measure its progress 00:22:16
Leveraging a Large Language Model (LLM) as a judge, especially with a clear rubric, can be a powerful tool for evaluating agents with diverse outputs, such as search reports with varying structures 00:22:45
Providing the LLM with a rubric and asking it to evaluate the agent's output can help assess the model's performance, for instance, by checking if it looked at the right sources or obtained the correct answer within a realistic range 00:22:58
To evaluate the performance of a model, it is necessary to benchmark whether it is getting the right answers and following the right process, and while certain methods can be used for evaluation, human evaluation is still essential to test the system manually and understand its workings 00:23:27
One example of evaluation is answer accuracy, where a Large Language Model (LLM) is used as a judge to determine whether the answer is accurate, which is more robust to variations in the output compared to simply checking for a specific integer or text 00:23:58
Another way to evaluate agents is by checking tool use accuracy, which involves verifying if the model uses the correct tools in the process, and this can be done programmatically by checking the transcript for specific tool calls, such as web search or search flights 00:24:27
A good evaluation method for agents is to use a benchmark like Towen, which is an open-source benchmark that allows evaluation of whether agents reach the correct final state, such as modifying a database or interacting with a user in a specific way 00:25:12
The final state of an agent can be evaluated by checking if the model has reached the expected state, such as changing a flight in a database, and this can be done by verifying if the database has been updated correctly or if certain files have been modified 00:25:28
The use of benchmarks like Towen can be applied to various use cases, including checking if a database is updated correctly or if certain files were modified, providing a robust way to evaluate the final state reached by an agent 00:25:58
QA 00:26:17
Building prompts for agents typically starts with a short and simple prompt, and then iterates and adds more complexity as needed, with the goal of making the agent operate consistently in production 00:26:17
The process of building an agent prompt involves starting simple, testing it out, and then adding instructions and examples to the prompt as edge cases or small flaws are discovered, with the aim of increasing the number of test cases that pass 00:27:25
Adding few-shot examples to the prompt, a technique commonly used in traditional prompting, is not as effective for state-of-the-art frontier models and agents, as it can limit the model's capabilities and is not necessary since these models are already trained to think in advance 00:28:24
Instead of telling the model to use a chain of thought, it is more effective to tell the model how to use its thinking process, such as planning out its search or coding, and to remember specific things in its thinking process to help the agent stay on track 00:28:52
Giving the model examples can be helpful, but it is important not to be too prescriptive, and to allow the model to use its own thinking process to complete tasks 00:29:05

Introduction 
00:00

The session is focused on prompt engineering, bringing together a variety of perspectives from research, consumer, and enterprise sides to explore and discuss what prompt engineering is and what it entails 
00:00.


The session is led by Alex, who leads Developer Relations at Anthropic and has a background in prompt engineering, having worked on the prompt engineering team and held roles such as solutions architect and research 
00:16.


David Hershey is introduced, who works with customers at Anthropic, helping them with finetuning, adopting language models, and building systems with language models, and spends most of his time working with customers 
00:53.


Amanda Askell is introduced as the leader of one of the Finetuning teams at Anthropic, where she works on making Claude honest and kind 
01:11.


Zack Witten is introduced as a Prompt Engineer at Anthropic, who used to work with individual customers and now works on projects that aim to raise the overall levels of ambient prompting in society, such as the prompt generator and educational materials 
01:30.


The session aims to explore prompt engineering through a broad discussion, starting with a very broad question, and features a panel of experts with diverse experiences and perspectives 
01:50.


Defining prompt engineering 
02:05

Prompt engineering is defined as the process of trying to get the most out of a model by working with it to achieve things that would not have been possible otherwise, which involves clear communication and understanding the psychology of the model 
02:42.


The term "engineering" in prompt engineering comes from the trial and error process involved, where one can restart from scratch and try out different things independently without interference, allowing for experimentation and design 
03:02.


The engineering part of prompt engineering also involves iterating on a message, reverting back to a clean slate, and integrating prompts within a system as a whole, which can be complex and requires systems thinking 
04:00.


Prompts can be thought of as a way to program models, requiring consideration of data access, trade-offs in latency, and data provision, making it a distinct domain that deserves its own carve-out as a thing to reason about separately 
04:38.


A prompt can be seen as a form of natural language code, but trying to get too abstract with a prompt can be overcomplicating, and instead, a clear description of a task is often the goal, with precision and version control being important aspects 
05:38.


The process of writing and refining prompts involves tracking experiments, managing versions, and compiling instructions into outcomes, similar to coding, and written text can now be treated as code 
06:00.


The discussion leads to the question of what makes a good prompt engineer, following the loose definition of prompt engineering established earlier 
06:18.


What makes a good prompt engineer 
06:38

When hiring a prompt engineer in a research setting, the desired candidate should possess a mix of skills, including clear communication, the ability to clearly state and understand tasks, and think about and describe concepts well, with the ability to iterate and improve prompts being crucial 
06:38.


Being a good writer is not highly correlated with being a good prompt engineer, as the role involves more than just writing, including iterating and refining prompts based on model responses, with a willingness to send hundreds of prompts to the model in a short span to achieve decent results 
07:40.


A key aspect of prompt engineering is thinking about ways in which a prompt might go wrong, particularly in unusual cases, and considering edge cases where the prompt may be unclear or misinterpreted, such as when applying a prompt to a large number of cases 
08:01.


To develop effective prompts, it is essential to test them with various inputs, including unusual or edge cases, such as empty strings or datasets with no relevant information, to understand how the model will respond and provide additional instructions as needed 
08:37.


When working with customer-facing applications, such as chatbots, it is vital to consider the actual user input, which may be imperfectly phrased, contain typos, or lack punctuation, rather than idealized user input, to develop prompts that can handle real-world scenarios 
09:15.


Reading and analyzing model outputs is critical in prompt engineering, similar to examining data in machine learning, to ensure that the model is responding as intended and to identify areas for improvement, such as when a model interprets a prompt in a more abstract sense than intended 
09:33.


Prompt engineers should be able to reason about the actual traffic and user behavior, going beyond idealized scenarios, and consider the potential pitfalls and misinterpretations of their prompts, as discussed by Amanda and others, including Zack and Dave 
09:51.


Prompt engineering requires considering how a model will view instructions, as well as how a user will interact with the model, making it a complex task that involves thinking about the theory of mind and the relationship between the model, user, and prompt engineer 
10:10.


Writing instructions for a task is challenging because it is difficult to untangle personal knowledge and assumptions, and to clearly communicate the necessary information to a model, which is a key skill that differentiates good prompt engineers from bad ones 
10:51.


A good prompt engineer must be able to systematically break down the required information and avoid conditioning the prompt on their prior understanding of a task, which can result in prompts that are unclear or nonsensical to others 
11:30.


Effective prompt engineering involves being able to step back from personal knowledge and communicate clearly with a model, which is a unique system that has a lot of knowledge but not everything, and being able to do so is a crucial skill for prompt engineers 
11:47.


The quality of a prompt is critical, as a poorly written prompt can be impossible for a model to understand, even if a human can comprehend it, and prompt engineers must consider the limitations of current models when designing prompts 
12:06.


Refining prompts 
12:19

To effectively interact with AI models, it is essential to ask good, probing questions in response, similar to how a human would, and think through what the other person would say, which can be achieved by asking the model to identify unclear or ambiguous instructions, and this process can help improve the prompt 
12:19.


When the model makes a mistake, asking it to explain why it got something wrong and how it could be improved can sometimes lead to the model providing a corrected version of the instructions, although the success of this approach may vary by task 
12:59.


Explaining to the model what it got wrong can help it identify things in the query, and trying to get the model to correct its mistakes can be a valuable learning experience, even if it does not always work 
13:49.


Using the model in a variety of different scenarios, such as through Slack channels, can help develop intuitions for when to trust the model, but it is also important to approach the model with a critical mindset and not trust it by default 
14:24.


Models can be unreliable when dealing with tasks that are slightly out of distribution, and it is crucial to test their limits and understand when they are likely to make mistakes, which can be done by hammering on the model and trying to identify its weaknesses 
15:02.


The development of intuitions for when to trust the model is not just a matter of usage and experience, but also requires an understanding of the model's limitations and the ability to identify when it is likely to be reliable or unreliable, and Amanda's approach is to not trust the model by default and instead test its limits 
15:21.


To get rid of noise in data points, it is essential to look across many data points, and a well-constructed set of a few hundred prompts can be more signal than thousands of poorly crafted ones, allowing for trust in the model's consistency when examining 100 outputs 
15:39.


In machine learning, signals are often numbers, such as logprobs, but models that output words and other content can provide more insight into their thought process, enabling a better understanding of how they arrived at a result, not just whether the task was completed correctly 
16:19.


The quality of prompting can significantly impact the success of an experiment, making the difference between a failed and successful experiment, and neglecting the prompting component can lead to poor model performance, such as 1% versus 0.1% 
17:16.


Effective prompting is crucial not only for experiments but also for deployment, as a well-crafted prompt can make a model work, and changing the prompt can be the difference between a successful and unsuccessful deployment 
17:39.


However, there is a risk of getting stuck in the pursuit of a mythical, perfect prompt, and it is essential to balance grinding on a prompt with recognizing when it is not possible to achieve a desired outcome, even with a perfect prompt 
18:19.


To determine whether something is possible with a perfect prompt, it is necessary to check if the model understands the task, and if not, it may be clear that it is not close, allowing for the decision to stop grinding on the prompt 
18:37.


By examining the model's thought process and asking it to explain its reasoning, it is possible to get a sense of whether it is on the right track and make progress towards achieving a correct result 
18:55.


The process of fine-tuning AI models can be frustrating when encountering tasks that the model cannot perform, no matter how much tweaking is done, and such instances are rare but infuriating, prompting a desire to wait for more advanced models 
19:19.


An experiment was conducted where Claude, an AI model, was hooked up to a Game Boy emulator to play Pokémon Red, but despite complex prompting layouts, the model struggled to understand the Game Boy screen and required a significant amount of time to produce marginally better results 
19:54.


The experiment involved writing better prompts to help Claude understand the Game Boy screen, which led to incremental improvements, but ultimately, the results were not satisfactory, and it was decided that waiting for a more advanced model would be a better use of time 
20:10.


The prompts used in the Pokémon experiment involved explaining to the model that it was in the middle of a Pokémon game and providing detailed representations of the game state, including superimposing a grid over the image and describing each segment in visual detail 
21:27.


The process of prompting for images was found to be different from prompting for text, with some intuitions about text not transferring to images, and multi-shot prompting being less effective for images 
22:03.


The limitations of Claude's visual acuity were highlighted, as it was unable to improve its ability to pick up specific features within an image, despite being provided with multiple prompts, and this limitation was also observed in the Pokémon experiment 
22:20.


The goal of training an AI model is to enable it to accurately identify and describe objects, such as walls and characters, in a game, but it can be challenging to achieve perfect accuracy, and the model may be off by a little bit 
23:01.


To play a game well, it is essential to have a sense of continuity, including knowing whether an NPC has been interacted with before, and without this continuity, the model may struggle to make progress 
23:19.


Describing an NPC can be particularly difficult, as the model may not be able to accurately identify the NPC's appearance, such as whether they are wearing a hat or not, even after being shown the same NPC multiple times 
23:37.


Experimenting with different approaches, such as imagining the game art as a real human and describing their appearance, can be a useful way to test the model's capabilities 
24:00.


One potential prompt that was used to try to improve the model's performance was telling it that it was a screen reader for a blind person, which may have helped to some extent 
24:18.


Honesty, personas and metaphors in prompts 
24:29

Prompting a language model by assigning it a persona or role can yield mixed results, and its effectiveness may have decreased in newer models 
24:29.


Being honest with the model about the situation and providing clear communication is preferred, as lying or forcing a specific scenario may not be necessary, especially with more capable models 
24:47.


When constructing an evaluation dataset for a language model, it is more effective to target the actual task directly, rather than pretending to be in a different scenario, such as a teacher creating a quiz for children 
25:26.


Using clear communication and directly stating the task can be more efficient, as language models understand concepts like evaluation datasets and can provide examples 
25:45.


Providing a metaphor or analogy for the task can sometimes be helpful, as seen in an example where asking a model to grade a chart as if it were a high school assignment helped it understand the desired analysis 
26:41.


However, coming up with effective metaphors can be challenging, and defaulting to similar tasks or scenarios can lead to a loss of nuance in the desired outcome, especially in enterprise prompts 
27:22.


As language models improve, being prescriptive and direct in prompts is likely to become a more effective approach, rather than relying on indirect methods or metaphors 
27:40.


When providing advice on how to effectively use AI models, it is often suggested to consider the exact situation and context in which the model is being used, rather than relying on shortcuts or general assumptions about the task at hand 
28:05.


To achieve this, it can be helpful to be prescriptive about the context and details of the task, such as specifying that the model is being used as a support chat window in a product, and providing clear instructions and definitions for the task 
28:47.


Role prompting can be problematic if used as a shortcut, as it may not accurately convey the intended task to the model, and it is essential to provide sufficient details and context to avoid leaving important information out 
29:05.


As AI models become more advanced and capable of differentiating between topics, it is crucial to be clear and specific when providing prompts and instructions to ensure the model understands the task correctly 
29:24.


The use of certain prompting techniques, such as completion era models, may not be as effective with more advanced models, and it is essential to experiment and understand the capabilities and limitations of different models, including pretrained and RLHF models 
30:03.


Many people try to apply their intuitions about how AI models work, often based on their understanding of pretrained models, but these intuitions may not be applicable to more advanced models or specific use cases 
30:41.


A helpful thought experiment for developing effective prompts is to imagine hiring a temp agency to send someone to complete a task, and considering what instructions and context would be necessary to provide to that person to ensure they understand the task correctly 
31:18.


When providing instructions to the hypothetical temp worker, it is essential to use clear and specific language, avoiding assumptions and providing definitions for key terms, such as what constitutes a "good chart" in a particular context 
31:37.


When creating prompts for AI models, it is often more effective to provide a detailed description of the task, assuming the model has some competence and understanding of the world, rather than trying to be overly concise or using keywords, as people tend to do when they think of a text box as a Google search box 
31:56.


A useful approach to crafting prompts is to describe the task as if explaining it to someone with little context but who is quite competent, and then use that description as the prompt, which can lead to better results than trying to come up with a perfect, insightful line of information or instruction 
32:16.


Many people are lazy when writing prompts and try to take shortcuts, which can lead to ineffective prompts, but simply describing the task and what is expected of the model can often yield better results, as seen in an example where someone's description of what they wanted the model to do was used as a prompt and it worked 
32:33.


Some individuals still haven't grasped what they are doing when prompting AI models and tend to obsess over finding the perfect line of information or instruction, rather than providing a clear and detailed description of the task, which can make it easier for the model to understand and complete the task 
33:09.


It is also important to consider edge cases and provide the model with "outs" or options for what to do if it encounters something unexpected or unsure, such as outputting a tag indicating uncertainty, rather than trying to force the model to follow instructions that may not be applicable in every situation 
34:08.


By giving the model options for handling uncertain or unexpected situations, users can review the results and determine the best course of action, rather than relying on the model to make decisions without guidance, and this approach can help to improve the overall effectiveness of the prompts 
34:26.


Providing detailed descriptions and options for handling edge cases can help to instill intuitions in the model and improve its ability to complete tasks, rather than trying to write prescriptive instructions that may not be feasible or effective 
34:44.


Iterating on tests with language models like Claude can help improve data quality by identifying and correcting poorly written tests, as the most common outcome is finding terrible tests that were accidentally written, which can be discovered when the model gets the test wrong 
35:02.


Giving prompts to people, especially those who are not familiar with the task, can be a valuable way to learn and evaluate language models, as it provides a clean way to learn things and can help identify areas for improvement 
35:38.


Evaluating language models by taking the evaluation oneself, as was done with Karpathy's ImageNet, can be a useful approach, as it allows for a deeper understanding of the task and the model's performance, and can help identify biases and areas for improvement 
35:56.


Using instructions provided with evaluations and trying to understand the task without context can be a great way to learn and improve language models, as it allows for a more objective evaluation and can help identify areas where the model needs improvement 
36:14.


Evaluating language models can be a challenging task, as some evaluations may have unclear or ambiguous instructions, and human benchmarks may be difficult to achieve, as evidenced by the fact that human level performance on some tasks may be as high as 90%, while individual performance may be significantly lower 
36:30.


The quality of evaluation questions can vary greatly, with some being poorly written or ambiguous, making it difficult to get accurate or reliable results from language models, as seen in the example of the MMLU questions 
36:53.


Model reasoning 
37:12

The concept of chain of thought, which involves a model explaining its reasoning before providing an answer, is discussed, and the question of whether this reasoning is real or just a computational space is raised, with some arguing that it is harmful to personify the model's reasoning 
37:12.


Structuring the reasoning and helping the model iterate on how it should do reasoning can lead to better outcomes, regardless of whether the reasoning is considered "real" or not, and this approach has been found to be useful in practice 
38:08.


A possible way to test the effectiveness of the model's reasoning is to replace the original reasoning with realistic-looking but incorrect reasoning and see if the model still concludes with the wrong answer, with some studies, such as the Alignment papers, having explored this idea 
39:04.


Having the model write a story before finishing a task is not considered as effective as having it provide reasoning, and experiments have shown that providing meaningless text, such as repeating the words "um" and "ah", does not lead to the same outcomes as providing actual reasoning 
39:45.


The model's ability to reach the right answer despite laying out incorrect steps in its reasoning is noted, which challenges the idea of personifying the model's reasoning and highlights the complexity of the model's thought process 
40:22.


The importance of good grammar and punctuation in prompts is discussed, with some arguing that while it may not be necessary, it can be beneficial to have attention to detail in prompts, as noted by Zack 
40:59.


When crafting prompts, it is essential to put effort into styling them, as having strong opinions about prompt styling can be beneficial, even if they are arbitrary, and attending to details such as typos and grammatical issues can make a difference 
41:22.


Some individuals may prioritize conceptual clarity over grammatical correctness, but it is still important to check for typos and grammatical issues, especially in final prompts, as it is a simple check that can improve the overall quality of the prompt 
42:21.


The approach to prompting can vary depending on the type of model being used, with pretrained models being more forgiving of typos and grammatical errors, whereas models fine-tuned with reinforcement learning from human feedback (RLHF) are less likely to tolerate such errors 
43:10.


Leverageing the characteristics of pretrained models, such as their ability to generate typo-ridden text, can be useful in certain situations, like creating inputs that mimic real-world user behavior 
43:50.


When interacting with models like Claude, using a tone and style similar to what is expected in the response can be effective, as the model is trained to guess what the user wants it to act like, and using elements like emojis can influence the model's response 
44:08.


The goal of prompt engineering is to communicate effectively with the model, and understanding how different models respond to various input styles is crucial, with models like Claude being able to figure out what the user wants, even if the input contains typos or other errors 
44:47.


When a user writes a message to Claude that includes a bunch of emojis, it is likely that the user also wants to receive a response from Claude that includes a bunch of emojis, which is not an unexpected outcome 
45:10


Enterprise vs research vs general chat prompts 
45:21

Enterprise prompts, research prompts, and general chat prompts in Claude.ai have different characteristics, with research prompts often requiring more variety and diversity, and enterprise prompts valuing reliability and consistency, with a focus on format and responsiveness to user desires 
45:21.


In research prompts, having many examples can constrain the model's ability to explore a range of possibilities, whereas in consumer applications, examples are used to ensure reliability and consistency in the model's responses 
46:01.


When writing prompts for research, it's common to use illustrative examples that are distinct from the data the model will be running on, to encourage the model to think critically and understand the task, rather than just providing a rote output 
47:32.


In contrast, enterprise prompts often require a more careful and nuanced approach, with a focus on testing the prompt against a wide range of inputs and use cases, to ensure that the model performs well in a variety of scenarios 
49:27.


The approach to prompting also differs between general chat settings, where the human-in-the-loop can provide feedback and iterate on the prompt, and enterprise settings, where the prompt must be able to handle a wide range of inputs and scenarios without human intervention 
50:06.


Despite these differences, good prompts are still good across both research and enterprise settings, and the time and effort put into crafting a well-designed prompt can pay off in terms of the model's performance and responsiveness 
50:45.


Amanda and David have different approaches to writing prompts, with Amanda preferring fewer examples and more illustrative examples, and David using many examples to ensure reliability and consistency in the model's responses 
46:20.


The goal of prompting in research settings is often to tap into the range of possibilities that the model can explore, and to understand the task and the model's capabilities, rather than just achieving a specific outcome 
47:14.


In enterprise settings, the goal is often to design a system that can perform well in a variety of scenarios, and to provide a reliable and consistent user experience, which requires a more careful and nuanced approach to prompting 
49:47.


Tips to improve prompting skills 
50:52

To improve prompting skills, it is recommended to read prompts and model outputs, break down what makes a good prompt, and test it out through experimentation, as well as talking to the model a lot, which helps to understand how it works 
51:12.


Giving prompts to another person, especially someone with no context, can be helpful in identifying potential issues and improving the prompt, and it is also advised to read prompts as if encountering them for the first time, to ensure they are clear and effective 
51:55.


Practicing prompting repeatedly and finding joy in it can make it easier to improve, and trying to automate tasks with AI models or "red teaming" them can be a fun and educational experience, as suggested by Amanda 
52:12.


Trying to get the model to do something that is thought to be beyond its capabilities can be a valuable learning experience, as it helps to probe the boundaries of what the model is capable of and understand how it works 
52:56.


Finding the hardest task possible and attempting to accomplish it with the model can be an effective way to learn about prompt engineering and the model's capabilities, even if it ends in failure, as it provides valuable insights into navigating the model's limitations 
53:31.


Jailbreaking 
53:56

Jailbreaking in AI prompt engineering involves finding the boundary limits of what a model can do by trying different phrasings and wordings, and figuring out how it responds to various inputs through a lot of trial and error 
53:56.


When a jailbreak prompt is written, it is unclear what exactly happens inside the model, but one possible explanation is that the model is being put very out of distribution from its training data, such as using a large number of tokens or huge, long pieces of text that are not typically seen during fine-tuning 
54:36.


Some examples of jailbreaks include using specific phrases or sentences to trick the model into responding in a certain way, such as asking it to repeat something or provide a response in a different language, which can reveal insights into the model's training process 
55:16.


Jailbreaking can feel like a mix of hacking and understanding how the system works, requiring knowledge of how the model predicts text, responds to reasoning, and attends to certain inputs, as well as an understanding of the training data and how it may have been different for multilingual models 
55:54.


The process of jailbreaking can also be seen as a form of social engineering, but it is also about understanding the system and the training, and using that knowledge to get around the way the models were trained, which is a key aspect of prompt engineering 
56:11.


The topic of jailbreaking is complex and not yet fully understood, and it is hoped that further research and interpretation will be able to provide more insights into how models respond to jailbreak prompts and how they can be improved 
56:28.


Evolution of prompt engineering 
56:51

The history of prompt engineering has undergone significant changes over the past three years, evolving from pretrained models and earlier models like Claude 1 to more advanced models like Claude 3.5 Sonnet, with differences in how users interact with the models and the amount of work required to create effective prompts 
56:51.


As new prompt engineering hacks and techniques are discovered, they are often incorporated into the models through training, making them short-lived, except for techniques like examples and chain of thought, which have become integral to the models' functionality 
57:27.


The development of models has led to the elimination of certain hacks, such as the need to instruct models to think step-by-step for math problems, as they can now naturally understand the requirement for certain types of tasks 
58:03.


Models are continually unlocking new capabilities, and as a result, prompt engineering is adapting to these changes, with users needing to develop new strategies to effectively utilize the models' expanding abilities 
58:22.


There is a growing trend towards trusting models with more information and context, rather than simplifying tasks or hiding complexity, as users become more confident in the models' ability to handle complex tasks and integrate large amounts of data 
59:02.


Some users have developed the instinct to provide models with direct access to relevant information, such as research papers, to learn prompting techniques or test new methods, rather than attempting to replicate the techniques through manual prompting 
59:39.


This approach can be useful when testing new prompting techniques or training models to prompt other models, as it allows users to leverage the models' ability to read and understand complex texts, such as research papers 
01:00:13.


When working with models, it is helpful to respect their capabilities and not "baby" them by dumbing down complex information, as they can often understand and process it on their own, such as reading a paper and then generating a model based on its content 
01:00:32.


The approach to prompting models has changed over time, with a shift towards imagining oneself in the place of the model and understanding its capabilities, which can lead to more effective prompting 
01:01:30.


Prompting models effectively involves simulating what it's like to be a model, such as a pretrained model or an RLHF model, and inhabiting their "mind space" to understand how they process information and generate output 
01:02:04.


The quality of output can vary depending on the model being inhabited, with pretrained and RLHF models having different characteristics and requiring different approaches to prompting 
01:02:40.


Inhabiting the mind space of an RLHF model can be easier due to its similarity to human-like processing, whereas pretrained models can be more unhuman-like and require a different approach to understanding their output 
01:03:01.


Some individuals find it easier to inhabit the mind space of pretrained models, as they have a better understanding of how they process information and generate output, whereas RLHF models can be more complex and less well-understood 
01:03:38.


The value of reading various materials to understand AI models is being questioned, with a consideration of whether spending time reading the internet is more helpful than reading books in order to build intuition and predict what a model will do 
01:03:54.


Reading materials that are not on the internet, such as books, may be less valuable per word read for predicting a model's behavior and building intuition compared to reading online content, including social media forums 
01:04:14.


Future of prompt engineering 
01:04:34

The future of prompt engineering is a highly debated topic, with questions surrounding whether everyone will become prompt engineers and if models will eventually become smart enough to not require prompting 
01:04:34.


The ability to clearly state what the goal should be will always be important, and prompt engineering will continue to play a role in providing enough information for models to understand what is expected of them 
01:05:14.


As models improve, the tools and methods used for prompt engineering will evolve, and collaboration between humans and models like Claude will become more prevalent, helping to figure out what needs to be written down and what is missing 
01:06:07.


The use of models to help with prompting will likely increase in the future, with models being used to generate examples, tweak answers, and provide a starting point for people without extensive prompt engineering experience 
01:06:50.


High-bandwidth interaction between humans and models will become more common, allowing for real-time feedback and integration of models into everyday tasks, making it easier for people to work with models and generate desired outputs 
01:07:29.


Meta prompts are becoming increasingly important, with some individuals spending most of their time finding prompts that get models to generate the desired outputs, and the future of prompt engineering will likely involve more complex and nuanced interactions between humans and models 
01:08:07.


Prompt engineering is typically used to achieve top performance from models, especially for tasks that are challenging, and this approach allows for interaction with models at an advanced level, beyond what everyday models can do 
01:08:24.


As models become more capable, reaching human or above-human levels on certain tasks, the role of prompting may shift, with the model potentially prompting the user to clarify their intentions or provide more information 
01:09:28.


This transition could lead to a change in the relationship between the user and the model, from a straightforward instruction-based interaction to a more collaborative and consultative approach, similar to the dynamic between a designer and a client 
01:11:03.


In this new paradigm, the model may need to elicit information from the user, almost like an interview, to ensure it understands the task requirements and can deliver the desired outcome, which is a approach that has already been explored with models like Claude 
01:10:25.


The evolution of prompt engineering may render it less necessary in certain domains, as highly advanced models could potentially extract the required information from the user's brain and perform the task without needing extensive prompting, leading to a shift from a "temp agency employee" to a "designer" type of relationship 
01:11:40.


The future of AI prompt engineering is likely to involve elicitation from the user, where the model draws out information from the user to generate better prompts, and this concept is already being explored in a manual way, with potential expansion in the enterprise side of things 
01:11:58.


The process of prompting can be compared to teaching, where the goal is to understand how the student thinks and show them where they are making mistakes, but in the context of AI, it becomes a skill of introspection, where the user must think about what they want and make themselves legible to the model 
01:12:53.


Defining new concepts is a common technique used in prompting, where the user puts into words what they want, and sometimes invents new concepts to convey nuanced ideas to the model, such as what makes a good chart or when to grade something as correct 
01:13:30.


The models currently available are not designed to elicit information from users, unless prompted to do so, but in the future, they may be able to do so without requiring the user to define concepts and provide explicit guidance 
01:14:11.


Philosophy, particularly the style of writing that aims to make complex ideas legible to an educated layperson, is relevant to prompting, as it involves taking complex ideas and phrasing them in a clear and accurate way, without talking down to the reader 
01:14:30.


The training techniques used in prompting are fascinating, and the experience of writing philosophy papers that are legible to an educated layperson has been found to be useful in developing the skills required for effective prompting, such as conveying complex ideas in a clear and concise manner 
01:15:05.


The concept of Claude, a model that can engage in guided interactions with users, is an example of how the future of prompting may involve more interactive and collaborative approaches to generating prompts and understanding user needs 
01:12:34.


The process of prompting involves taking thoughts and ideas from one's brain, analyzing them to ensure full understanding, and then externalizing them in a way that can be understood by others, much like explaining an argument to someone 
01:15:41.


This concept is similar to a teaching method where students are asked to explain their arguments in a clear and concise manner, and then write it down, often resulting in a well-written essay 
01:16:01.


Having an education or knowledge in a particular subject can be beneficial in describing and externalizing one's thoughts and ideas, making it easier to prompt well 
01:16:19.


The idea of externalizing one's brain and explaining thoughts and ideas in a clear manner is considered a key aspect of prompting, and can be applied to various situations, including writing and communication 
01:16:19.


