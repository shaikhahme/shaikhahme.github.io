This documetn describes how 1 new page shall look
the page is called shk-vis

## SHK-VIS

Background that of lined paper like that off a type writter. Full screen, nothing else visible yet
Scroll based animation
font: typewriter like
The scroll length should be short to get to this. I will describe the key frames

whenever i say type, i mean in the animation and font of typewritter

1 animation
"Shaikh's Virtues"

2nd animation
arrow drawn from the centre text to the east
types "Engineering"

3rd animation
arrow drawn from the centre text to the west
types "Sociology and Psychology"

4th animation 
 arrow drawn at north and types out "Cybersecurity". 

5th animation
arrow drawn at south and types out "Artifical Intelligence".

this shoudl create 4 axis with the Shaikhs interest in the centre.

animate a circle around it joining all 4 arrounds at the ends. 
pan camera to become a sphere
add vectors with labels in relevant spaces
1. AI Alligment (equidistannt psyhcology, engineering, cybersecurity ai)
2. AI Security Similar to AI Allignment but closer to Cyberseucirty
3. Security Architecture (between Cybersecurity and engineering)

the animation should seamlessly end into interactble sphere with the vectors and the labels visible when the sphere is rotated in the right direction 


---

2nd phase

All labels are clickable and they lead to relevant pages.
the lead is also animated like prezzi- zoom out from sphrere and zoom in to the relevant page, with a back button that zooms in and out back to the sphere

For now have text that says test. keep the paper bakcground

teh goal is to have it look like tis being zoomed out of a page and into a another part of the page.

---
3rd phase pre text

AI Security
I love AI security, AI Security is the best. I grew up with psych and AI security hence it is my faviorate
Projects
1. AI Project 1
   2. Description: Test Proj
   3. Link: test Link
   4. Tags: AI Security, AI, Cybersecurity
   5. mindmap: 
      6. set up repo, rectangle, Sets up the repo
      7. Set up agent rectangle, sets up the agent
      8. Upload Agent, diamond, if agent ready upload it
      9. Upload to github, rectangle, uploads ready made agent to github
2. AI Project 3
   3. Description: Test Proj 2
   3. Link: test Link 2
   4. Tags: AI Alligntment, AI Security
   5. mindmap:
       6. set up repo, rectangle, Sets up the repo
       7. Set up agent rectangle, sets up the agent
       8. test if the Agent is alligned, diamond, if agent ready upload it
       9. allign agent, rectangle, uploads ready made agent to github
10. 2. AI Project 4
3. Description: Test Proj 4
3. Link: test Link 2
4. Tags: AI Alligntment, AI Security
5. mindmap:
    6. set up repo, rectangle, Sets up the repo
    7. Set up agent rectangle, sets up the agent
    8. test if the Agent is alligned, diamond, if agent ready upload it
    9. allign agent, rectangle, uploads ready made agent to github
10. 2. AI Project 4
3. Description: Test Proj 5
3. Link: test Link 2
4. Tags: AI Alligntment, AI Security
5. mindmap:
    6. set up repo, rectangle, Sets up the repo
    7. Set up agent rectangle, sets up the agent
    8. test if the Agent is alligned, diamond, if agent ready upload it
    9. allign agent, rectangle, uploads ready made agent to github
10. 2. AI Project 4
3. Description: Test Proj 6
3. Link: test Link 2
4. Tags: AI Alligntment, AI Security
5. mindmap:
    6. set up repo, rectangle, Sets up the repo
    7. Set up agent rectangle, sets up the agent
    8. test if the Agent is alligned, diamond, if agent ready upload it
    9. allign agent, rectangle, uploads ready made agent to github
10. 
---
3rd phase
relevant page structure
Short note
I write about my relationship with the topic, why i like it and why i think its important

Projects
a scrollable UI element that neatly arranges all the projects vertically. click on any project temporarily opens a side bar on the right side 
the side bar then shows a mind map step by step animated similarly as the arrows being drawing, the type wirtter effect, but this time not linked to the scroll but rather timming
once the animation is done the side bar stays until the user clicks in the centre area or clicks anotehr projct

Projects json will so 
Name: String
Tags: json list
Description: string
Link: string
MindMap: json object

MindMap json object
{step:number,shape:string,title:string,description:string}

the animation enginine reads the mindmap and creates teh animation with the relevant shape,titel, description and order


---
4th phase project infomraiton

Interactive session with user. 
pull the list of all repositories from github. 

walk the user step by step per respository
say the name of the repo
ask the description
assume which tags are appropriate for it and ask the user to confirm, tags are the same as axis or concepts from the code
ask if there are any qucik updates to be made (renaming repo), updating readme with new description, adding tags to the readme
ask if there any long term updates.
ask the general flow of the application


Create a projects.json that stores a list of projects which can then be read by the relevant pages
1. name: Repo name
2. Description: User given description
3. Tags: user given
4. Mindmap: Made from the user explained general flow

for mind map:
Arbitary Step - black rectangle
Descision - Diamond
AI Step - red rectangle 
output - green rectangle

create a updates.md
1. Repo Name
2. Short Updates
3. Large Updates


---
5th phase
improvmeents

1. Add diameter that goes vertical from cybersec to ai
2. remove teh 5 cursor animations in the beginging, they dont disaapear if you scroll back to it after the sphere is revealed 
4. Make background constant, not moving
5. make the sphere interactable before the actual end of the scroll
6. Allign all the texts except the ones on the sphere with the lines in teh background.


