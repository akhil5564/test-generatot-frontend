import Swal from "sweetalert2";

type AlertType = 'success' | 'error' ;


export const alert=(type:AlertType,message:string)=>{

    switch(type){
         case 'success':
          Swal.fire({
            title: 'Success!',
            text:message,
            icon: 'success',
          })  
          break;
          case 'error':
            Swal.fire({
                title: 'Error!',
                text:message,
                icon: 'error',
              }) 
    }

}